import { NextResponse, NextRequest } from 'next/server';
import { campaignsStore } from '../store'; 

console.log('[API /api/campaigns/[campaignId]/route.ts] Module loaded. Initial campaignsStore length:', campaignsStore.length); // Log on module load

interface CampaignData {
  id: string;
  campaign_id?: string; // campaign_id might be the same as id or a separate field
  // Add other expected properties of a campaign object if known
  [key: string]: any; // Allow other properties
}

export async function GET(
  request: NextRequest, 
  context: { params: { campaignId: string } } // Changed to pass context directly
) {
  // Await context.params before accessing campaignId
  const resolvedParams = await context.params;
  const campaignId = resolvedParams.campaignId;
  
  console.log(`[API GET /api/campaigns/${campaignId}] Called. campaignsStore length: ${campaignsStore.length}`);
  console.log(`[API GET /api/campaigns/${campaignId}] Entire store for debugging:`, JSON.stringify(campaignsStore, null, 2));

  const campaign = campaignsStore.find((c: CampaignData) => c.id === campaignId || c.campaign_id === campaignId);

  if (campaign) {
    console.log(`[API GET /api/campaigns/${campaignId}] Found campaign:`, JSON.stringify(campaign, null, 2));
    return NextResponse.json(campaign);
  } else {
    console.warn(`[API GET /api/campaigns/${campaignId}] Campaign NOT FOUND.`);
    return NextResponse.json({ message: `Campaign with ID ${campaignId} not found` }, { status: 404 });
  }
}
