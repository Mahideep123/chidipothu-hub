import os
from pymongo import MongoClient
import cloudinary
import cloudinary.api
from dotenv import load_dotenv

# Load from .env - handles running from backend/ or project root
if os.path.exists('.env'):
    load_dotenv('.env')
elif os.path.exists('backend/.env'):
    load_dotenv('backend/.env')
else:
    # Fallback to absolute relative path
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    load_dotenv(env_path)

def cleanup():
    # 1. MongoDB Cleanup
    mongo_url = os.getenv("MONGO_URL")
    project_db_name = os.getenv("DB_NAME", "chidipothu_hub")
    
    print(f"--- MongoDB Cleanup ---")
    try:
        client = MongoClient(mongo_url, serverSelectionTimeoutMS=10000)
        dbs = client.list_database_names()
        
        # Redundant databases identified during audit
        redundant_dbs = ['sample_mflix', 'pdf_movies', 'sessions', 'movies']
        
        for db_name in redundant_dbs:
            if db_name in dbs:
                print(f"Dropping database: {db_name}")
                client.drop_database(db_name)
            else:
                print(f"Database {db_name} not found or already dropped.")
        
        # Cleanup within project database
        project_db = client[project_db_name]
        colls = project_db.list_collection_names()
        if 'files' in colls:
            print(f"Dropping empty/legacy 'files' collection in {project_db_name}")
            project_db.drop_collection('files')
            
        # Get all referenced public_ids
        referenced_public_ids = set()
        properties = list(project_db.properties.find({}, {"file_attachments": 1}))
        for p in properties:
            for feat in p.get("file_attachments", []):
                if feat.get("public_id"):
                    referenced_public_ids.add(feat["public_id"])
        
        print(f"Referenced Cloudinary files in MongoDB: {len(referenced_public_ids)}")

    except Exception as e:
        print(f"MongoDB error: {e}")

    # 2. Cloudinary Cleanup
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    )
    
    print("\n--- Cloudinary Cleanup ---")
    try:
        all_resources = []
        next_cursor = None
        while True:
            res = cloudinary.api.resources(type="upload", max_results=500, next_cursor=next_cursor)
            all_resources.extend(res.get('resources', []))
            next_cursor = res.get('next_cursor')
            if not next_cursor:
                break
        
        to_delete = []
        for r in all_resources:
            pid = r['public_id']
            # Delete samples
            if any(s in pid for s in ["sample", "cld-sample"]):
                to_delete.append(pid)
            # Delete foreign files (not in project folder AND not referenced)
            elif not pid.startswith("chidipothu_hub/") and pid not in referenced_public_ids:
                to_delete.append(pid)
            # Delete orphaned files in chidipothu_hub/ folder
            elif pid.startswith("chidipothu_hub/") and pid not in referenced_public_ids:
                to_delete.append(pid)
        
        print(f"Found {len(to_delete)} files to delete in Cloudinary.")
        
        # Delete in batches of 100 (Cloudinary limit for delete_resources)
        for i in range(0, len(to_delete), 100):
            batch = to_delete[i:i+100]
            print(f"Deleting batch: {batch[:3]} ... ({len(batch)} files)")
            cloudinary.api.delete_resources(batch)
            
        print("Cloudinary cleanup complete.")

    except Exception as e:
        print(f"Cloudinary error: {e}")

if __name__ == "__main__":
    confirm = input("Are you sure you want to proceed with deletion? (yes/no): ")
    if confirm.lower() == 'yes':
        cleanup()
    else:
        print("Cleanup cancelled.")
