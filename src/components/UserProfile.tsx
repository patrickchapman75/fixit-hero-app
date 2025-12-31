import { useState, useEffect } from 'react';
import { User, MapPin, Home, Save, Map } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile, updateUserLocation } from '../services/authService';

export default function UserProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // Form state - separate first and last name
  const [firstName, setFirstName] = useState(profile?.firstName || '');
  const [lastName, setLastName] = useState(profile?.lastName || '');
  const [zipCode, setZipCode] = useState(profile?.zipCode || '');
  const [homeAge, setHomeAge] = useState(profile?.homeAge?.toString() || '');

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      setZipCode(profile.zipCode || '');
      setHomeAge(profile.homeAge?.toString() || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const ageNum = homeAge ? parseInt(homeAge, 10) : null;
      if (homeAge && (isNaN(ageNum!) || ageNum! < 0)) {
        alert('Home age must be a valid positive number');
        setLoading(false);
        return;
      }

      const { error } = await updateUserProfile(user.id, {
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        zipCode: zipCode.trim() || null,
        homeAge: ageNum
      });

      if (error) {
        alert('Failed to update profile: ' + error.message);
      } else {
        await refreshProfile();
        setIsEditing(false);
      }
    } catch (error) {
      alert('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGetLocation = async () => {
    if (!user) return;

    setLocationLoading(true);
    try {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by this browser');
        setLocationLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { error } = await updateUserLocation(
              user.id,
              position.coords.latitude,
              position.coords.longitude
            );

            if (error) {
              alert('Failed to save location: ' + error.message);
            } else {
              await refreshProfile();
            }
          } catch (error) {
            alert('Failed to save location');
          } finally {
            setLocationLoading(false);
          }
        },
        (error) => {
          let message = 'Unable to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access denied. Please enable location permissions.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out.';
              break;
          }
          alert(message);
          setLocationLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    } catch (error) {
      alert('Failed to get location');
      setLocationLoading(false);
    }
  };

  if (!user || !profile) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-orange-400 mb-2">User Profile</h2>
            <p className="text-slate-400">Manage your account information</p>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <User size={18} />
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        <div className="space-y-6">
          {/* Email (read-only) */}
          <div className="bg-slate-900 rounded-xl p-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
            <div className="text-white bg-slate-800 px-4 py-2 rounded-lg">
              {user.email}
            </div>
            <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
          </div>

          {/* First Name */}
          <div className="bg-slate-900 rounded-xl p-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <User size={16} className="inline mr-2" />
              First Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
            ) : (
              <div className="text-white bg-slate-800 px-4 py-2 rounded-lg">
                {profile?.firstName || 'Not provided'}
              </div>
            )}
          </div>

          {/* Last Name */}
          <div className="bg-slate-900 rounded-xl p-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <User size={16} className="inline mr-2" />
              Last Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
            ) : (
              <div className="text-white bg-slate-800 px-4 py-2 rounded-lg">
                {profile?.lastName || 'Not provided'}
              </div>
            )}
          </div>

          {/* Zip Code */}
          <div className="bg-slate-900 rounded-xl p-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <MapPin size={16} className="inline mr-2" />
              Zip Code
            </label>
            {isEditing ? (
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="12345"
                maxLength={5}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
            ) : (
              <div className="text-white bg-slate-800 px-4 py-2 rounded-lg">
                {profile.zipCode || 'Not provided'}
              </div>
            )}
          </div>

          {/* Home Age */}
          <div className="bg-slate-900 rounded-xl p-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Home size={16} className="inline mr-2" />
              Age of Home (years)
            </label>
            {isEditing ? (
              <input
                type="number"
                value={homeAge}
                onChange={(e) => setHomeAge(e.target.value)}
                placeholder="25"
                min="0"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
            ) : (
              <div className="text-white bg-slate-800 px-4 py-2 rounded-lg">
                {profile.homeAge ? `${profile.homeAge} years` : 'Not provided'}
              </div>
            )}
          </div>

          {/* Location */}
          <div className="bg-slate-900 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-300">
                <Map size={16} className="inline mr-2" />
                Location
              </label>
              <button
                onClick={handleGetLocation}
                disabled={locationLoading}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors flex items-center gap-1"
              >
                <Map size={14} />
                {locationLoading ? 'Getting...' : 'Get GPS'}
              </button>
            </div>
            <div className="text-white bg-slate-800 px-4 py-2 rounded-lg">
              {profile.latitude && profile.longitude
                ? `${profile.latitude.toFixed(6)}, ${profile.longitude.toFixed(6)}`
                : 'Location not set'
              }
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Click "Get GPS" to automatically detect your location for better local recommendations
            </p>
          </div>

          {/* Account Info */}
          <div className="bg-slate-900 rounded-xl p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Account Information</h3>
            <div className="space-y-2 text-sm text-slate-400">
              <p>Member since: {new Date(profile.created_at || Date.now()).toLocaleDateString()}</p>
              <p>Last updated: {new Date(profile.updated_at || Date.now()).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Save Button */}
          {isEditing && (
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Save size={18} />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}