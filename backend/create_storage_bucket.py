#!/usr/bin/env python3

"""
Script to create Firebase Storage bucket if it doesn't exist
"""

import os
import sys

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def create_storage_bucket():
    """Create Firebase Storage bucket if it doesn't exist"""
    try:
        print("Checking Firebase Storage bucket...")
        
        # Initialize Firebase
        from firestore_repository import FirestoreRepository
        from firebase_admin import storage
        
        firestore_repo = FirestoreRepository()
        print("✅ Firebase initialized successfully")
        
        # Check if default bucket exists
        try:
            bucket = storage.bucket()
            print(f"✅ Default bucket exists: {bucket.name}")
            
            # Test upload to ensure bucket is accessible
            blob = bucket.blob("test-file.txt")
            blob.upload_from_string("This is a test file to verify bucket access")
            print("✅ Bucket is accessible and writable")
            
            # Clean up test file
            blob.delete()
            print("✅ Test file cleaned up")
            
        except Exception as e:
            print(f"❌ Default bucket error: {e}")
            
            # Try to get bucket info from Firebase config
            import firebase_admin
            app = firebase_admin.get_app()
            
            if hasattr(app.options, 'storage_bucket') and app.options.storage_bucket:
                bucket_name = app.options.storage_bucket
                print(f"🔧 Attempting to create bucket: {bucket_name}")
                
                # Since we can't create buckets programmatically with Firebase Admin SDK,
                # we need to create them through the Firebase Console or gcloud CLI
                print(f"""
⚠️  MANUAL ACTION REQUIRED:
                
The Firebase Storage bucket '{bucket_name}' doesn't exist or isn't accessible.

To fix this, you have two options:

1. Create the bucket through Firebase Console:
   - Go to https://console.firebase.google.com/project/dev-volto-interviews/storage
   - Click "Get started" if Storage isn't set up yet
   - This will create the default bucket automatically

2. Create the bucket using gcloud CLI:
   - Run: gcloud storage buckets create gs://{bucket_name} --project=dev-volto-interviews

The bucket name should be: {bucket_name}
""")
                return False
            else:
                print("❌ No storage bucket configured in Firebase options")
                return False
                
        return True
        
    except Exception as e:
        print(f"❌ Error checking storage bucket: {e}")
        return False

if __name__ == "__main__":
    success = create_storage_bucket()
    sys.exit(0 if success else 1) 