import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import os
from enum import Enum

class CollectionName(Enum):
    CAMPAIGNS = "campaigns"
    INTERVIEWS = "interviews"

class FirestoreRepository:
    def __init__(self, environment=None):
        """
        Initialize FirestoreRepository with environment-specific configuration.
        
        Args:
            environment (str, optional): Environment to use ('dev', 'prod', or None for auto-detection)
        """
        if not firebase_admin._apps:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            
            # Determine environment
            if environment is None:
                # Auto-detect environment from environment variable
                environment = os.getenv('ENVIRONMENT', 'dev').lower()
            
            # Map environment to configuration
            env_configs = {
                'dev': {
                    'cred_file': '.env.dev.json',
                    'storage_bucket': 'dev-volto-interviews.firebasestorage.app'
                },
                'prod': {
                    'cred_file': '.env.prod.json',
                    'storage_bucket': 'prod-volto-interviews.firebasestorage.app'
                }
            }
            
            if environment not in env_configs:
                raise ValueError(f"Unsupported environment: {environment}. Supported environments: {list(env_configs.keys())}")
            
            config = env_configs[environment]
            local_cred_file_path = os.path.join(script_dir, config['cred_file'])

            print(f"Attempting Firebase initialization for {environment} environment with: {local_cred_file_path}")
            if os.path.exists(local_cred_file_path):
                try:
                    cred = credentials.Certificate(local_cred_file_path)
                    firebase_admin.initialize_app(cred, {
                        'storageBucket': config['storage_bucket']
                    })
                    print(f"Firebase Admin SDK initialized successfully for {environment} environment using: {local_cred_file_path}")
                except Exception as e:
                    error_message = (
                        f"Failed to initialize Firebase Admin SDK for {environment} environment using {local_cred_file_path}. "
                        f"Ensure the file exists and is a valid service account key. Error: {e}"
                    )
                    raise RuntimeError(error_message) from e
            else:
                error_message = (
                    f"Credentials file not found at {local_cred_file_path} for {environment} environment. "
                    f"This repository is configured to use {config['cred_file']} for {environment} authentication. "
                    "Please ensure the file exists and is correctly placed."
                )
                raise RuntimeError(error_message)
        else:
            print("Firebase Admin SDK already initialized.")

        self.db = firestore.client()

    def create(self, collection: CollectionName, document_id: str, data: dict):
        """Creates a new document or overwrites an existing document in the specified collection."""
        doc_ref = self.db.collection(collection.value).document(document_id)
        doc_ref.set(data)
        return document_id

    def read(self, collection: CollectionName, document_id: str):
        """Reads a document from the specified collection."""
        doc_ref = self.db.collection(collection.value).document(document_id)
        doc = doc_ref.get()
        if doc.exists:
            return doc.to_dict()
        else:
            return None

    def update(self, collection: CollectionName, document_id: str, data: dict):
        """Updates an existing document in the specified collection."""
        doc_ref = self.db.collection(collection.value).document(document_id)
        doc_ref.update(data) # Using update for partial updates
        return document_id

    def delete(self, collection: CollectionName, document_id: str):
        """Deletes a document from the specified collection."""
        doc_ref = self.db.collection(collection.value).document(document_id)
        doc_ref.delete()
        return document_id

    def query(self, collection: CollectionName, field: str, op: str, value: any):
        """Queries documents in a collection based on a single field condition."""
        docs_stream = self.db.collection(collection.value).where(field, op, value).stream()
        documents = []
        for doc in docs_stream:
            doc_data = doc.to_dict()
            doc_data['id'] = doc.id
            documents.append(doc_data)
        return documents

    def list_all(self, collection: CollectionName):
        """Lists all documents in the specified collection."""
        docs_stream = self.db.collection(collection.value).stream()
        documents = []
        for doc in docs_stream:
            doc_data = doc.to_dict()
            doc_data['id'] = doc.id # Add document ID to the dictionary
            documents.append(doc_data)
        return documents

# Example Usage (optional, for testing)
if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Check for environment-specific credential files
    dev_cred_file = os.path.join(script_dir, ".env.dev.json")
    prod_cred_file = os.path.join(script_dir, ".env.prod.json")
    
    print("\n--- Firestore Repository Example Usage (Environment-Aware) ---")
    
    # Determine which environment to test based on available files
    test_environment = None
    if os.path.exists(dev_cred_file):
        test_environment = 'dev'
        print(f"Found development credentials at: {dev_cred_file}")
    elif os.path.exists(prod_cred_file):
        test_environment = 'prod'
        print(f"Found production credentials at: {prod_cred_file}")
    else:
        print("Error: No credential files found. Please ensure either '.env.dev.json' or '.env.prod.json' is in the same directory as this script.")
        exit(1)
    
    print(f"Testing with {test_environment} environment...")
    try:
        repo = FirestoreRepository(environment=test_environment)
        test_collection = CollectionName.INTERVIEWS # Using the collection you updated

        example_doc_id = "doc_example_001"
        initial_data = {"name": "Test Document", "category": "Example", "value": 100}
        update_payload = {"value": 150, "status": "updated"}

        # 1. Create
        print(f"\n1. Creating document: {example_doc_id} in collection '{test_collection.value}'")
        repo.create(test_collection, example_doc_id, initial_data)
        print(f"   Created document: {example_doc_id}")

        # 2. Read
        print(f"\n2. Reading document: {example_doc_id} from collection '{test_collection.value}'")
        retrieved_doc = repo.read(test_collection, example_doc_id)
        print(f"   Read document: {retrieved_doc}")

        # 3. Update
        print(f"\n3. Updating document: {example_doc_id} in collection '{test_collection.value}' with {update_payload}")
        repo.update(test_collection, example_doc_id, update_payload)
        print(f"   Updated document: {example_doc_id}")
        retrieved_after_update = repo.read(test_collection, example_doc_id)
        print(f"   Read after update: {retrieved_after_update}")
        
        # 4. List All (should show our document)
        print(f"\n4. Listing all documents in collection '{test_collection.value}'...")
        all_docs_before_delete = repo.list_all(test_collection)
        print(f"   All documents: {all_docs_before_delete}")

        # 5. Delete
        # print(f"\n5. Deleting document: {example_doc_id} from collection '{test_collection.value}'")
        # repo.delete(test_collection, example_doc_id)
        # print(f"   Deleted document: {example_doc_id}")

        # # 6. Read (attempt after delete)
        # print(f"\n6. Attempting to read deleted document: {example_doc_id}")
        # retrieved_after_delete = repo.read(test_collection, example_doc_id)
        # print(f"   Read after delete: {retrieved_after_delete}")
        
        # 7. List All (should show document is gone or collection is empty if it was the only one)
        print(f"\n7. Listing all documents in collection '{test_collection.value}' after delete...")
        all_docs_after_delete = repo.list_all(test_collection)
        print(f"   All documents after delete: {all_docs_after_delete}")
        
        print(f"\nExample usage with single entity completed successfully for collection '{test_collection.value}'.")

    except RuntimeError as e:
        print(f"Could not run Firestore example: {e}") 
    except Exception as e:
        print(f"An unexpected error occurred during the example: {e}")
        import traceback
        traceback.print_exc()
        
    print("--- End of Firestore Repository Example Usage ---") 