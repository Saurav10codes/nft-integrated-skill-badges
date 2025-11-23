import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { colors } from '../config/colors';

interface CustomBadge {
  id: string;
  badge_name: string;
  svg_url: string;
  created_at: string;
  is_default?: boolean;
}

interface ProfileTabProps {
  userId: string;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ userId }) => {
  const [badgeName, setBadgeName] = useState('');
  const [svgFile, setSvgFile] = useState<File | null>(null);
  const [svgPreview, setSvgPreview] = useState<string | null>(null);
  const [customBadges, setCustomBadges] = useState<CustomBadge[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomBadges();
  }, [userId]);

  const fetchCustomBadges = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching badges for user:', userId);
      
      const { data, error } = await supabase
        .from('custom_badges')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Fetched badges:', data);
      
      // Just show user's badges (including default ones created at signup)
      setCustomBadges(data || []);
    } catch (err: any) {
      console.error('Error fetching custom badges:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.includes('svg')) {
      setError('Please upload an SVG file');
      return;
    }

    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
      setError('File size must be less than 1MB');
      return;
    }

    setSvgFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setSvgPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadBadge = async () => {
    if (!badgeName.trim()) {
      setError('Please enter a badge name');
      return;
    }

    if (!svgFile) {
      setError('Please select an SVG file');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      console.log('Uploading badge for user:', userId);

      // Upload SVG to Supabase Storage
      const fileExt = 'svg';
      const fileName = `${userId}_${Date.now()}.${fileExt}`;
      const filePath = `badges/${fileName}`;

      console.log('Uploading file to:', filePath);

      const { error: uploadError } = await supabase.storage
        .from('stellar')
        .upload(filePath, svgFile, {
          contentType: 'image/svg+xml',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('stellar')
        .getPublicUrl(filePath);

      console.log('Public URL:', publicUrl);

      // Save badge to database
      console.log('Saving to database:', { user_id: userId, badge_name: badgeName.trim(), svg_url: publicUrl });
      
      const { error: dbError } = await supabase
        .from('custom_badges')
        .insert({
          user_id: userId,
          badge_name: badgeName.trim(),
          svg_url: publicUrl
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      setSuccess('Badge created successfully! 🎉');
      setBadgeName('');
      setSvgFile(null);
      setSvgPreview(null);
      
      // Reset file input
      const fileInput = document.getElementById('svg-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Refresh badges list
      await fetchCustomBadges();
    } catch (err: any) {
      console.error('Error uploading badge:', err);
      setError(err.message || 'Failed to upload badge');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteBadge = async (badgeId: string, svgUrl: string, isDefault?: boolean) => {
    if (isDefault) {
      setError('Cannot delete default badges');
      return;
    }

    if (!confirm('Are you sure you want to delete this badge?')) return;

    try {
      setLoading(true);

      // Extract file path from URL
      const urlParts = svgUrl.split('/stellar/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        
        // Delete from storage
        await supabase.storage
          .from('stellar')
          .remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from('custom_badges')
        .delete()
        .eq('id', badgeId);

      if (error) throw error;

      setSuccess('Badge deleted successfully');
      await fetchCustomBadges();
    } catch (err: any) {
      console.error('Error deleting badge:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Create Badge Section */}
      <div
        className="bg-white shadow-md p-6 mb-6"
        style={{ borderRadius: '8px', border: `1px solid ${colors.lightBlue}` }}
      >
        <h3 className="text-xl font-bold mb-4" style={{ color: colors.darkRed }}>
          Create Custom Badge
        </h3>

        {error && (
          <div
            className="p-4 mb-4 border"
            style={{
              backgroundColor: colors.lightPink,
              borderColor: colors.rose,
              color: colors.darkRed,
              borderRadius: '6px'
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="p-4 mb-4 border"
            style={{
              backgroundColor: colors.lightMint,
              borderColor: colors.blue,
              color: colors.blue,
              borderRadius: '6px'
            }}
          >
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Badge Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Badge Name <span style={{ color: colors.rose }}>*</span>
            </label>
            <input
              type="text"
              value={badgeName}
              onChange={(e) => setBadgeName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 focus:outline-none focus:border-blue-400 transition-colors"
              style={{ borderRadius: '6px', backgroundColor: colors.cream }}
              placeholder="e.g., Python Expert Badge"
              maxLength={100}
            />
          </div>

          {/* SVG File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Upload SVG File <span style={{ color: colors.rose }}>*</span>
            </label>
            <input
              id="svg-upload"
              type="file"
              accept=".svg,image/svg+xml"
              onChange={handleFileChange}
              className="w-full px-4 py-2.5 border border-gray-300 focus:outline-none focus:border-blue-400 transition-colors"
              style={{ borderRadius: '6px', backgroundColor: colors.cream }}
            />
            <p className="text-xs text-gray-500 mt-1">Max size: 1MB</p>
          </div>
        </div>

        {/* SVG Preview */}
        {svgPreview && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Preview
            </label>
            <div
              className="p-4 flex items-center justify-center"
              style={{ backgroundColor: colors.cream, borderRadius: '6px', minHeight: '200px' }}
            >
              <img
                src={svgPreview}
                alt="SVG Preview"
                className="max-w-full max-h-64"
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUploadBadge}
          disabled={uploading || !badgeName.trim() || !svgFile}
          className="w-full text-white font-medium py-2.5 px-4 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: colors.blue,
            borderRadius: '6px'
          }}
        >
          {uploading ? 'Uploading...' : 'Create Badge'}
        </button>
      </div>

      {/* My Badges List */}
      <div
        className="bg-white shadow-md p-6"
        style={{ borderRadius: '8px' }}
      >
        <h3 className="text-xl font-bold mb-4" style={{ color: colors.darkRed }}>
          My Custom Badges ({customBadges.length})
        </h3>

        {loading && customBadges.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Loading badges...
          </div>
        ) : customBadges.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No custom badges yet. Create your first badge above!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customBadges.map((badge) => (
              <div
                key={badge.id}
                className="bg-white border shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                style={{ borderRadius: '6px', borderColor: colors.lightBlue }}
              >
                {/* Badge Image */}
                <div
                  className="h-48 flex items-center justify-center p-4"
                  style={{ backgroundColor: colors.cream }}
                >
                  <img
                    src={badge.svg_url}
                    alt={badge.badge_name}
                    className="max-w-full max-h-full"
                    style={{ objectFit: 'contain' }}
                  />
                </div>

                {/* Badge Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-bold text-lg" style={{ color: colors.darkRed }}>
                      {badge.badge_name}
                    </h4>
                    {badge.is_default && (
                      <span 
                        className="text-xs font-medium px-2 py-1"
                        style={{ 
                          backgroundColor: colors.lightMint, 
                          color: colors.blue,
                          borderRadius: '4px'
                        }}
                      >
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Created: {new Date(badge.created_at).toLocaleDateString()}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.open(badge.svg_url, '_blank')}
                      className="flex-1 text-white font-medium py-2 px-3 text-sm shadow-sm hover:shadow-md transition-all"
                      style={{
                        backgroundColor: colors.blue,
                        borderRadius: '6px'
                      }}
                    >
                      View
                    </button>
                    {!badge.is_default && (
                      <button
                        onClick={() => handleDeleteBadge(badge.id, badge.svg_url, badge.is_default)}
                        disabled={loading}
                        className="flex-1 text-white font-medium py-2 px-3 text-sm shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                        style={{
                          backgroundColor: colors.rose,
                          borderRadius: '6px'
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileTab;
