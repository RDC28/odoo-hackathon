"""One-time migration: copy the old SQLAlchemy/SQLite database (instance/carpool.db)
into the local MongoDB database used by the app now.

Run once after switching to MongoDB:  python migrate_sqlite_to_mongo.py
Safe to re-run — it wipes and re-fills the target Mongo database.
"""
import json
import os
import sqlite3
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import Config
from models import client, db, ensure_indexes

SQLITE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance', 'carpool.db')

# table name -> (mongo collection, JSON-encoded columns, boolean columns)
TABLES = {
    'companies': ('companies', ['carpool_config'], []),
    'users': ('users', [], ['has_onboarded']),
    'vehicles': ('vehicles', [], []),
    'rides': ('rides', ['start_location', 'destination_location', 'recurring_days', 'route_coords'], []),
    'bookings': ('bookings', ['pickup_point', 'drop_point'], []),
    'payments': ('payments', [], []),
    'wallet_transactions': ('wallet_transactions', [], []),
    'conversations': ('conversations', ['participant_ids'], []),
    'messages': ('messages', [], []),
    'ratings': ('ratings', [], []),
    'saved_places': ('saved_places', [], []),
    'review_feedback': ('review_feedback', [], []),
}


def _parse_created_at(value):
    """SQLite stores DateTime as 'YYYY-MM-DD HH:MM:SS[.ffffff]' strings."""
    if not value or not isinstance(value, str):
        return value
    for fmt in ('%Y-%m-%d %H:%M:%S.%f', '%Y-%m-%d %H:%M:%S'):
        try:
            return datetime.strptime(value, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return value


def migrate():
    if not os.path.exists(SQLITE_PATH):
        print(f'No SQLite database found at {SQLITE_PATH} — nothing to migrate.')
        print('Run `python seed.py` instead to load fresh demo data.')
        return

    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row

    existing_tables = {
        row[0] for row in
        conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
    }

    print(f'Migrating {SQLITE_PATH} -> MongoDB {Config.MONGO_URI}/{Config.MONGO_DB_NAME}')
    client.drop_database(Config.MONGO_DB_NAME)
    ensure_indexes()

    for table, (collection, json_cols, bool_cols) in TABLES.items():
        if table not in existing_tables:
            print(f'  {table}: table not found, skipped')
            continue
        docs = []
        for row in conn.execute(f'SELECT * FROM {table}'):
            doc = dict(row)
            for col in json_cols:
                if isinstance(doc.get(col), str):
                    try:
                        doc[col] = json.loads(doc[col])
                    except (ValueError, TypeError):
                        pass
            for col in bool_cols:
                if doc.get(col) is not None:
                    doc[col] = bool(doc[col])
            doc['created_at'] = _parse_created_at(doc.get('created_at'))
            docs.append(doc)
        if docs:
            db[collection].insert_many(docs)
        print(f'  {table}: {len(docs)} documents')

    conn.close()
    print('Migration complete.')


if __name__ == '__main__':
    migrate()
