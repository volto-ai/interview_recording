#!/usr/bin/env python3

import os
import firebase_admin
from firebase_admin import credentials
from firebase_admin import storage

def check_firebase_storage():
    """Check Firebase Storage configuration and list available buckets."""
    
    try:
        # Initialize Firebase if not already done
        if not firebase_admin._apps:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            cred_file = os.path.join(script_dir, "..", "env.dev.json")
            
            if not os.path.exists(cred_file):
                print(f"❌ Credentials file not found: {cred_file}")
                print("Please ensure the env.dev.json file exists")
                return
            
            try:
                cred = credentials.Certificate(cred_file)
                
                # Try without specifying bucket first to see what's available
                firebase_admin.initialize_app(cred, {
                    'storageBucket': 'dev-volto-interviews.firebasestorage.app'
                })
                print("✅ Firebase initialized successfully")
                
            except Exception as e:
                print(f"❌ Failed to initialize Firebase: {e}")
                return
        
        # Try to get default bucket
        try:
            bucket = storage.bucket()
            print(f"✅ Default bucket found: {bucket.name}")
            
            # Test basic bucket operations
            try:
                blobs = list(bucket.list_blobs(max_results=1))
                print(f"✅ Bucket is accessible and contains {len(blobs)} files (showing max 1)")
            except Exception as e:
                print(f"⚠️  Bucket exists but access test failed: {e}")
                
        except Exception as e:
            print(f"❌ No default bucket or access error: {e}")
            print("\nThis usually means:")
            print("1. Firebase Storage is not enabled for this project")
            print("2. The service account doesn't have Storage permissions")
            print("3. The bucket name in the configuration is incorrect")
            
        # Try specific bucket names
        test_buckets = [
            "dev-volto-interviews.appspot.com",
            "dev-volto-interviews.firebasestorage.app"
        ]
        
        print(f"\n🔍 Testing specific bucket names:")
        for bucket_name in test_buckets:
            try:
                bucket = storage.bucket(bucket_name)
                # Try to access bucket metadata
                bucket.reload()
                print(f"✅ Found bucket: {bucket_name}")
                print(f"   Location: {bucket.location}")
                print(f"   Storage Class: {bucket.storage_class}")
                break
            except Exception as e:
                print(f"❌ Bucket {bucket_name} not accessible: {e}")
                
    except Exception as e:
        print(f"❌ General error: {e}")

if __name__ == "__main__":
    print("🔧 Firebase Storage Configuration Checker")
    print("=" * 50)
    check_firebase_storage() 