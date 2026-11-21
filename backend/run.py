import os
import sys
from app import create_app, db
from app.utils.seed_data import seed_database

app = create_app()

@app.cli.command("seed-db")
def seed_command():
    """Seed the database with sample warehouse data."""
    with app.app_context():
        seed_database()
        print("Database seeded successfully via CLI.")

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        # Auto-seed if running locally and database is empty
        from app.models.user import User
        if not User.query.first():
            print("Database is empty. Populating with sample warehouse data...")
            seed_database()

    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() in ('true', '1')
    print(f"StockPilot API server running on port {port} (Debug: {debug})")
    app.run(host='0.0.0.0', port=port, debug=debug)
