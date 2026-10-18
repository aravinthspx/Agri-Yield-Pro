"""Send one test OTP SMS to check your SMS settings in backend/.env.

Usage (from the backend folder):
    venv\\Scripts\\python.exe sms_check.py 98XXXXXXXX
"""
import secrets
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))

from fastapi import HTTPException  # noqa: E402  (settings must load first)

from auth_routes import SMS_PROVIDER, normalize_phone, send_sms_otp, sms_ready  # noqa: E402


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    if not sms_ready():
        print(f"SMS is not set up yet (SMS_PROVIDER={SMS_PROVIDER or 'empty'}). "
              "Fill in the provider key in backend/.env, then run this again.")
        sys.exit(1)
    try:
        phone = normalize_phone(sys.argv[1])
        code = f"{secrets.randbelow(1_000_000):06d}"
        send_sms_otp(phone, code)
    except HTTPException as err:
        print(f"FAILED: {err.detail}")
        sys.exit(1)
    print(f"Sent via {SMS_PROVIDER} to {phone}. Check the phone for the code {code}.")


if __name__ == "__main__":
    main()
