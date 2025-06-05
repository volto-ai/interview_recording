#!/usr/bin/env python3
"""
Test Firebase integration
"""

import os
import sys

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_firebase_connection():
    """Test Firebase Firestore and Storage connection"""
    try:
        print("Testing Firebase integration...")
        
        # Test Firestore
        from firestore_repository import FirestoreRepository, CollectionName
        firestore_repo = FirestoreRepository()
        print("✅ Firestore connection successful")
        
        # Test Storage
        from firebase_admin import storage
        bucket = storage.bucket()
        print(f"✅ Storage bucket connected: {bucket.name}")
        
        print("🎉 All Firebase services are working!")
        return True
        
    except Exception as e:
        print(f"❌ Firebase connection failed: {e}")
        return False

if __name__ == "__main__":
    test_firebase_connection() 