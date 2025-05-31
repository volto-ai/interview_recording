import { NextResponse } from 'next/server';
import { campaignsStore } from './store'; // Import from the new store file

console.log('[API /api/campaigns/route.ts] Module loaded. Initial campaignsStore length:', campaignsStore.length); // Log on module load

/**
 * Handles GET requests to /api/campaigns
 * Returns campaigns from the in-memory store.
 */
export async function GET(request: Request) {
  console.log('[API GET /api/campaigns] Called. Current store length:', campaignsStore.length);
  console.log('[API GET /api/campaigns] Returning store contents:', JSON.stringify(campaignsStore, null, 2));
  return NextResponse.json(campaignsStore);
}

/**
 * Handles POST requests to /api/campaigns
 * Adds the received campaign data to the in-memory store.
 */
export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('[API POST /api/campaigns] Called with data:', JSON.stringify(data, null, 2));

    campaignsStore.push(data);
    console.log('[API POST /api/campaigns] Data pushed. campaignsStore length is now:', campaignsStore.length);
    console.log('[API POST /api/campaigns] Current store contents:', JSON.stringify(campaignsStore, null, 2));
    
    return NextResponse.json({ message: 'Campaign data added to in-memory store', receivedData: data }, { status: 201 });
  } catch (error) {
    console.error('[API POST /api/campaigns] Error processing request:', error);
    return NextResponse.json({ message: 'Error processing request', error: (error as Error).message }, { status: 500 });
  }
}

// Optional: Add a way to clear the store for testing, e.g., via a specific query param or another endpoint.
// For example, a DELETE handler could clear it:
// export async function DELETE(request: Request) {
//   console.log('DELETE /api/campaigns called, clearing in-memory store.');
//   campaignsStore = [];
//   return NextResponse.json({ message: 'In-memory store cleared' });
// }
