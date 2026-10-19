"""Check a Postgres connection string before putting it on Render.

1. Paste the string after DATABASE_URL= in backend/.env (that file stays on your computer).
2. Run from the backend folder:
       venv\\Scripts\\python.exe db_check.py
It connects once and prints OK, or exactly what is wrong. The password is never printed.
"""
import getpass
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))

# Optional: test a URL without editing .env, typing the password hidden:
#     venv\Scripts\python.exe db_check.py "postgresql://user:[YOUR-PASSWORD]@host:5432/postgres"
if len(sys.argv) > 1:
    os.environ["DATABASE_URL"] = sys.argv[1]
    os.environ["DATABASE_PASSWORD"] = getpass.getpass("Database password (hidden): ")

from sqlalchemy import text  # noqa: E402

import database  # noqa: E402  (reads DATABASE_URL)


def main():
    url = database.engine.url
    if url.drivername.startswith("sqlite"):
        print("DATABASE_URL is empty in backend/.env - paste the connection string after DATABASE_URL=")
        return
    print(f"Connecting to {url.host} as {url.username} (database {url.database}) ...")
    try:
        with database.engine.connect() as conn:
            version = conn.execute(text("select version()")).scalar()
    except Exception as err:  # show the reason, never the URL
        msg = str(getattr(err, "orig", err)).splitlines()
        reason = next((l.strip() for l in msg if "password authentication failed" in l), None) or msg[0][:200]
        print("FAILED:", reason)
        if "password authentication failed" in reason:
            print("-> The password is not the current one. Copy the connection string again "
                  "(with the real password, not *****) and paste again.")
        return
    print("OK - connected:", version.split(",")[0])
    print("This exact string will work on Render: paste it into DATABASE_URL there.")


if __name__ == "__main__":
    main()
