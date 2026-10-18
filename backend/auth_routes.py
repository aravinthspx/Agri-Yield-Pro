"""Account features: phone OTP login, password change / reset, Google sign-in, profile.

SMS delivery
------------
Set SMS_PROVIDER to send real SMS:
  - "fast2sms": FAST2SMS_API_KEY
  - "msg91":    MSG91_AUTH_KEY, MSG91_TEMPLATE_ID   (DLT-approved OTP template)
  - "twilio":   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
Without it the app runs in development mode: the code is printed in the server
log and returned to the browser as `dev_code` (never do this in production —
set APP_ENV=production to disable it).

Google sign-in
--------------
Set GOOGLE_CLIENT_ID to the OAuth "Web application" client ID from Google Cloud
Console (add http://localhost:5173 and your site to "Authorized JavaScript origins").
"""
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

import models
from auth import ALGORITHM, SECRET_KEY, create_access_token, get_password_hash, verify_password
from database import get_db

router = APIRouter(prefix="/api/auth", tags=["Accounts"])

APP_ENV = os.environ.get("APP_ENV", "development")
SMS_PROVIDER = os.environ.get("SMS_PROVIDER", "").strip().lower()
_SMS_KEYS = {
    "fast2sms": ["FAST2SMS_API_KEY"],
    "msg91": ["MSG91_AUTH_KEY", "MSG91_TEMPLATE_ID"],
    "twilio": ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM"],
}


def sms_ready() -> bool:
    """A provider is chosen and all its keys are filled in."""
    return SMS_PROVIDER in _SMS_KEYS and all(os.environ.get(k, "").strip() for k in _SMS_KEYS[SMS_PROVIDER])


if SMS_PROVIDER and not sms_ready():
    print(f"[SMS] SMS_PROVIDER={SMS_PROVIDER!r} but its keys are missing — running OTP in development mode.", flush=True)
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")

OTP_TTL = timedelta(minutes=5)
OTP_RESEND_GAP = timedelta(seconds=30)
OTP_MAX_PER_HOUR = 5
OTP_MAX_ATTEMPTS = 5
TOKEN_TTL = timedelta(days=7)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def normalize_phone(raw: str) -> str:
    """Indian mobile numbers → +91XXXXXXXXXX. Raises 400 if not valid."""
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    if not re.fullmatch(r"[6-9]\d{9}", digits):
        raise HTTPException(status_code=400, detail="Enter a valid 10-digit Indian mobile number.")
    return "+91" + digits


def _phone_or_none(raw: Optional[str]) -> Optional[str]:
    try:
        return normalize_phone(raw) if raw else None
    except HTTPException:
        return None


def find_user_by_phone(db: Session, phone: str) -> Optional[models.User]:
    user = db.query(models.User).filter(models.User.phone == phone).first()
    if user:
        return user
    # Older accounts may have saved the number in another format.
    for u in db.query(models.User).filter(models.User.phone.isnot(None)).all():
        if _phone_or_none(u.phone) == phone:
            return u
    return None


def check_password_strength(pw: str):
    if len(pw) < 8 or not re.search(r"[A-Za-z]", pw) or not re.search(r"\d", pw):
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters with letters and numbers.")


def _hash_code(phone: str, code: str) -> str:
    return hmac.new(SECRET_KEY.encode(), f"{phone}:{code}".encode(), hashlib.sha256).hexdigest()


def user_out(u: models.User) -> dict:
    return {
        "id": u.id, "full_name": u.full_name, "email": u.email, "phone": u.phone,
        "state": u.state, "district": u.district, "village": u.village,
        "preferred_language": u.preferred_language, "profile_photo": u.profile_photo,
        "auth_provider": u.auth_provider or "local", "has_password": bool(u.hashed_password),
    }


def session_for(u: models.User) -> dict:
    token = create_access_token({"sub": u.email, "uid": u.id}, expires_delta=TOKEN_TTL)
    return {"access_token": token, "token_type": "bearer", "user": user_out(u)}


def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> models.User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Please log in.")
    try:
        payload = jwt.decode(authorization.split(" ", 1)[1], SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Your session has expired. Please log in again.")
    user = None
    if payload.get("uid") is not None:
        user = db.query(models.User).filter(models.User.id == payload["uid"]).first()
    if user is None and payload.get("sub"):
        user = db.query(models.User).filter(models.User.email == payload["sub"]).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Account not found. Please log in again.")
    return user


# ─── SMS ─────────────────────────────────────────────────────────────────────

class SmsError(Exception):
    """Provider refused the message; the text is safe to show the user."""


def _post(url: str, data: dict, headers: dict, form: bool = False) -> dict:
    body = urllib.parse.urlencode(data).encode() if form else json.dumps(data).encode()
    headers = {"Content-Type": "application/x-www-form-urlencoded" if form else "application/json",
               "Accept": "application/json", "User-Agent": "AgriYieldPro/1.0", **headers}
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            raw = r.read()
    except urllib.error.HTTPError as e:  # providers put the reason in the error body
        raw = e.read()
    try:
        return json.loads(raw or b"{}")
    except json.JSONDecodeError:
        return {"raw": raw.decode(errors="replace")[:200]}


def _fast2sms_send(local_number: str, code: str):
    """Fast2SMS. FAST2SMS_ROUTE=otp (default, needs the OTP route enabled on your
    account) or q (Quick SMS — works on new accounts, costs a little more)."""
    route = os.environ.get("FAST2SMS_ROUTE", "otp").strip().lower()
    if route == "q":
        data = {"route": "q", "numbers": local_number, "flash": "0",
                "message": f"{code} is your Agri-Yield Pro login code. Valid 5 minutes. Do not share it."}
    else:
        data = {"route": "otp", "variables_values": code, "numbers": local_number, "flash": "0"}
    r = _post("https://www.fast2sms.com/dev/bulkV2", data, {"authorization": os.environ["FAST2SMS_API_KEY"].strip()})
    if r.get("return") is not True:
        msg = r.get("message") or r.get("raw") or "unknown error"
        if isinstance(msg, list):
            msg = "; ".join(map(str, msg))
        raise SmsError(f"Fast2SMS: {msg}")


def send_sms_otp(phone: str, code: str) -> bool:
    """Returns True when a real SMS was sent, False in development mode."""
    local = phone[3:]
    if not sms_ready():
        print(f"[DEV OTP] {phone} -> {code}  (set SMS_PROVIDER and its key in backend/.env to send real SMS)", flush=True)
        return False
    try:
        if SMS_PROVIDER == "fast2sms":
            _fast2sms_send(local, code)
            return True
        if SMS_PROVIDER == "msg91":
            _post("https://control.msg91.com/api/v5/otp?" + urllib.parse.urlencode(
                      {"template_id": os.environ["MSG91_TEMPLATE_ID"], "mobile": phone[1:], "otp": code}),
                  {}, {"authkey": os.environ["MSG91_AUTH_KEY"]})
            return True
        if SMS_PROVIDER == "twilio":
            sid, tok = os.environ["TWILIO_ACCOUNT_SID"], os.environ["TWILIO_AUTH_TOKEN"]
            auth = base64.b64encode(f"{sid}:{tok}".encode()).decode()
            _post(f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
                  {"To": phone, "From": os.environ["TWILIO_FROM"], "Body": f"Agri-Yield Pro code: {code}. Valid 5 minutes. Do not share it."},
                  {"Authorization": f"Basic {auth}"}, form=True)
            return True
    except SmsError as err:
        print(f"[SMS] send failed: {err}", flush=True)
        raise HTTPException(status_code=502, detail=f"Could not send the SMS ({err}). Please try again later.")
    except Exception as err:
        print(f"[SMS] send failed: {type(err).__name__}: {err}", flush=True)
        raise HTTPException(status_code=502, detail="Could not send the SMS right now. Please try again.")
    return False


# ─── Schemas ─────────────────────────────────────────────────────────────────

class OtpSend(BaseModel):
    phone: str
    purpose: str = "login"   # "login" | "reset"


class OtpVerify(BaseModel):
    phone: str
    code: str


class PasswordReset(BaseModel):
    phone: str
    code: str
    new_password: str


class PasswordChange(BaseModel):
    current_password: Optional[str] = None
    new_password: str


class GoogleLogin(BaseModel):
    credential: str


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    village: Optional[str] = None
    preferred_language: Optional[str] = None


# ─── OTP ─────────────────────────────────────────────────────────────────────

def _consume_otp(db: Session, phone: str, code: str, purpose: str):
    otp = (db.query(models.OtpCode)
           .filter(models.OtpCode.phone == phone, models.OtpCode.purpose == purpose, models.OtpCode.used.is_(False))
           .order_by(models.OtpCode.id.desc()).first())
    if not otp or otp.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This code was already used or has expired. Please ask for a new one.")
    if otp.attempts >= OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many wrong tries. Please ask for a new code.")
    if not hmac.compare_digest(otp.code_hash, _hash_code(phone, re.sub(r"\D", "", code))):
        otp.attempts += 1
        db.commit()
        left = OTP_MAX_ATTEMPTS - otp.attempts
        raise HTTPException(status_code=400, detail=f"Wrong code. {left} tr{'y' if left == 1 else 'ies'} left.")
    otp.used = True
    db.commit()


@router.get("/config")
def auth_config():
    """Tells the login page which sign-in options are live."""
    return {
        "google_client_id": GOOGLE_CLIENT_ID or None,
        "sms_mode": "live" if sms_ready() else ("off" if APP_ENV == "production" else "development"),
    }


@router.post("/otp/send")
def otp_send(body: OtpSend, db: Session = Depends(get_db)):
    if body.purpose not in ("login", "reset"):
        raise HTTPException(status_code=400, detail="Unknown OTP purpose.")
    if APP_ENV == "production" and not sms_ready():
        raise HTTPException(status_code=503, detail="Mobile OTP is not switched on yet. Please log in with your email for now.")
    phone = normalize_phone(body.phone)
    if not find_user_by_phone(db, phone):
        raise HTTPException(status_code=404, detail="No account uses this mobile number. Please create an account first.")

    now = datetime.utcnow()
    recent = db.query(models.OtpCode).filter(models.OtpCode.phone == phone, models.OtpCode.created_at > now - timedelta(hours=1)).all()
    if len(recent) >= OTP_MAX_PER_HOUR:
        raise HTTPException(status_code=429, detail="Too many codes requested. Please try again in an hour.")
    last = max((o.created_at for o in recent), default=None)
    if last and now - last < OTP_RESEND_GAP:
        wait = int((OTP_RESEND_GAP - (now - last)).total_seconds()) + 1
        raise HTTPException(status_code=429, detail=f"Please wait {wait} seconds before asking for another code.")

    code = f"{secrets.randbelow(1_000_000):06d}"
    db.add(models.OtpCode(phone=phone, purpose=body.purpose, code_hash=_hash_code(phone, code),
                          expires_at=now + OTP_TTL, created_at=now))
    db.commit()
    sent = send_sms_otp(phone, code)
    resp = {"sent_to": phone[:-4].replace(phone[3:-4], "•" * len(phone[3:-4])) + phone[-4:],
            "expires_in": int(OTP_TTL.total_seconds()), "resend_after": int(OTP_RESEND_GAP.total_seconds()),
            "sms_mode": "live" if sent else "development"}
    if not sent and APP_ENV != "production":
        resp["dev_code"] = code  # development only — shown so the flow can be tested without SMS
    return resp


@router.post("/otp/verify")
def otp_verify(body: OtpVerify, db: Session = Depends(get_db)):
    phone = normalize_phone(body.phone)
    user = find_user_by_phone(db, phone)
    if not user:
        raise HTTPException(status_code=404, detail="No account uses this mobile number.")
    _consume_otp(db, phone, body.code, "login")
    if user.phone != phone:
        user.phone = phone
        db.commit()
    return session_for(user)


# ─── Passwords ───────────────────────────────────────────────────────────────

@router.post("/password/reset")
def password_reset(body: PasswordReset, db: Session = Depends(get_db)):
    phone = normalize_phone(body.phone)
    user = find_user_by_phone(db, phone)
    if not user:
        raise HTTPException(status_code=404, detail="No account uses this mobile number.")
    check_password_strength(body.new_password)
    _consume_otp(db, phone, body.code, "reset")
    user.hashed_password = get_password_hash(body.new_password)
    db.commit()
    return {"message": "Password updated. You can log in with your new password.", **session_for(user)}


@router.post("/password/change")
def password_change(body: PasswordChange, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.hashed_password:
        if not body.current_password or not verify_password(body.current_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Your current password is not correct.")
        if verify_password(body.new_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="New password must be different from the current one.")
    check_password_strength(body.new_password)
    user.hashed_password = get_password_hash(body.new_password)
    db.commit()
    return {"message": "Password changed.", "user": user_out(user)}


# ─── Google ──────────────────────────────────────────────────────────────────

@router.post("/google")
def google_login(body: GoogleLogin, db: Session = Depends(get_db)):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google sign-in is not set up on the server yet (GOOGLE_CLIENT_ID).")
    try:
        url = "https://oauth2.googleapis.com/tokeninfo?" + urllib.parse.urlencode({"id_token": body.credential})
        with urllib.request.urlopen(url, timeout=10) as r:
            info = json.loads(r.read())
    except Exception:
        raise HTTPException(status_code=401, detail="Google could not confirm this sign-in. Please try again.")
    if (info.get("aud") != GOOGLE_CLIENT_ID or info.get("iss") not in ("accounts.google.com", "https://accounts.google.com")
            or str(info.get("email_verified")).lower() != "true" or int(info.get("exp", 0)) < datetime.utcnow().timestamp()):
        raise HTTPException(status_code=401, detail="This Google sign-in is not valid for this app.")

    email = info["email"].lower()
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        user = models.User(full_name=info.get("name") or email.split("@")[0], email=email, hashed_password=None,
                           profile_photo=info.get("picture"), auth_provider="google")
        db.add(user)
        db.commit()
        db.refresh(user)
    elif not user.profile_photo and info.get("picture"):
        user.profile_photo = info["picture"]
        db.commit()
    return session_for(user)


# ─── Profile ─────────────────────────────────────────────────────────────────

@router.get("/me")
def me(user: models.User = Depends(get_current_user)):
    return user_out(user)


@router.patch("/me")
def update_me(body: ProfileUpdate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    data = body.model_dump(exclude_unset=True)
    if "phone" in data:
        if data["phone"]:
            phone = normalize_phone(data["phone"])
            other = find_user_by_phone(db, phone)
            if other and other.id != user.id:
                raise HTTPException(status_code=400, detail="This mobile number is already used by another account.")
            data["phone"] = phone
        else:
            data["phone"] = None
    if "full_name" in data and not (data["full_name"] or "").strip():
        raise HTTPException(status_code=400, detail="Name cannot be empty.")
    for k, v in data.items():
        setattr(user, k, v.strip() if isinstance(v, str) else v)
    db.commit()
    return user_out(user)
