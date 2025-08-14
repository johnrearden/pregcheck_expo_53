import mobileAds from 'react-native-google-mobile-ads';

/**
 * Initialize the Google Mobile Ads SDK
 * Should be called once at app startup
 * @returns {Promise} Promise that resolves when initialization is complete
 */
export const initializeAds = async () => {
  try {
    const adapterStatuses = await mobileAds().initialize();
    console.log('Mobile ads initialization complete:', adapterStatuses);
    return adapterStatuses;
  } catch (error) {
    console.error('Failed to initialize mobile ads:', error);
    throw error;
  }
};
