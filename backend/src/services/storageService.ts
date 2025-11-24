import { supabase } from '../config/supabase';

/**
 * Upload badge metadata JSON to Supabase Storage
 */
export const uploadBadgeMetadata = async (
  testId: string,
  walletAddress: string,
  metadata: any
): Promise<string> => {
  try {
    const fileName = `${testId}_${walletAddress}.json`;
    const filePath = `badge-metadata/${fileName}`;

    console.log('📤 Uploading badge metadata to storage...');
    console.log('  Bucket: stellar');
    console.log('  Path:', filePath);

    // Upload JSON file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('stellar')
      .upload(filePath, JSON.stringify(metadata, null, 2), {
        contentType: 'application/json',
        upsert: true, // Overwrite if exists
      });

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      throw new Error(`Failed to upload metadata: ${uploadError.message}`);
    }

    console.log('✅ Metadata uploaded successfully');

    // Generate public URL
    const supabaseUrl = process.env.SUPABASE_URL;
    const metadataUrl = `${supabaseUrl}/storage/v1/object/public/stellar/${filePath}`;

    console.log('🔗 Metadata URL:', metadataUrl);

    // Verify file exists
    const { data: listData } = await supabase.storage
      .from('stellar')
      .list('badge-metadata', {
        search: fileName,
      });

    if (!listData || listData.length === 0) {
      throw new Error('File upload verification failed');
    }

    return metadataUrl;
  } catch (error: any) {
    console.error('❌ Error uploading metadata:', error);
    throw error;
  }
};

/**
 * Generate badge metadata object
 */
export const generateBadgeMetadata = (
  testId: string,
  walletAddress: string,
  testTitle?: string,
  score?: number,
  totalScore?: number
): any => {
  const supabaseUrl = process.env.SUPABASE_URL;

  return {
    name: `${testTitle || 'Skill Badge'} - Achievement`,
    description: `Badge earned for completing ${testTitle || 'the test'} with a score of ${score}/${totalScore}`,
    image: `${supabaseUrl}/storage/v1/object/public/stellar/badge-metadata/badge-icon.png`,
    attributes: [
      {
        trait_type: 'Test ID',
        value: testId,
      },
      {
        trait_type: 'Test Title',
        value: testTitle || 'Unknown Test',
      },
      {
        trait_type: 'Wallet Address',
        value: walletAddress,
      },
      {
        trait_type: 'Score',
        value: score !== undefined && totalScore !== undefined ? `${score}/${totalScore}` : 'Passed',
      },
      {
        trait_type: 'Percentage',
        value:
          score !== undefined && totalScore !== undefined && totalScore > 0
            ? `${((score / totalScore) * 100).toFixed(2)}%`
            : 'N/A',
      },
      {
        trait_type: 'Issued Date',
        value: new Date().toISOString(),
      },
    ],
  };
};
