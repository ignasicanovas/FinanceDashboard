"""
migrations.py — Database schema creation and data migration.
Copiado de finanzas-n26/dashboard/migrations.py (sin cambios).
"""
import sqlite3
from datetime import datetime


def run_migrations(conn: sqlite3.Connection):
    """
    Run all pending database migrations on the provided connection.
    This should be called only once per app startup for the main DB.
    """
    # Create users table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT DEFAULT '',
            created_at TEXT,
            last_login TEXT
        )
    """)

    # Create user_accounts table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS user_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            account_id INTEGER NOT NULL,
            access_level TEXT DEFAULT 'owner',
            invited_at TEXT,
            invited_by_user_id INTEGER,
            UNIQUE(user_id, account_id),
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(account_id) REFERENCES accounts(id),
            FOREIGN KEY(invited_by_user_id) REFERENCES users(id)
        )
    """)

    # Add columns to accounts table if they don't exist
    try:
        conn.execute("ALTER TABLE accounts ADD COLUMN owner_user_id INTEGER DEFAULT NULL")
    except sqlite3.OperationalError:
        pass

    try:
        conn.execute("ALTER TABLE accounts ADD COLUMN is_shared INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass

    conn.commit()
