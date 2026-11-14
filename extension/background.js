/**
 * SuperJobGenie Background Service Worker (Manifest V3 - v5.1.0)
 * Includes Autonomous Scout Radar, chrome.alarms scheduler, and real-lead notifications
 */

const ALARM_NAME = 'sjg_autonomous_radar';
const DASHBOARD_BASE_URL = 'https://ais-dev-ktwblonwqqz4djz5kuuffg-423633136396.europe-west2.run.app';

// Initialize defaults on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('[SuperJobGenie v5.1.0] Extension installed successfully.');
  chrome.storage.local.get(['sjgSettings', 'radarConfig'], (res) => {
    if (!res.sjgSettings) {
      chrome.storage.local.set({
        sjgSettings: {
          enableDeepExtract: true,
          autoShowHud: true,
          backendApiUrl: DASHBOARD_BASE_URL
        }
      });
    } else if (
      res.sjgSettings.backendApiUrl &&
      res.sjgSettings.backendApiUrl.includes('dpehhkspkblknqvlwnko6m')
    ) {
      chrome.storage.local.set({
        sjgSettings: {
          ...res.sjgSettings,
          backendApiUrl: DASHBOARD_BASE_URL
        }
      });
    }

    if (!res.radarConfig) {
      chrome.storage.local.set({
        radarConfig: {
          enabled: true,
          targetRole: 'Full Stack Engineer / Tech Lead',
          targetLocations: 'US, UK, Taiwan, Singapore, Remote',
          minScore: 80,
          intervalMinutes: 60,
          desktopNotifications: true
        }
      });

      chrome.alarms.create(ALARM_NAME, {
        delayInMinutes: 1,
        periodInMinutes: 60
      });
    }
  });
});

// Periodic Scout Radar via chrome.alarms — uses real scanned leads when present
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    chrome.storage.local.get(['radarConfig', 'sjg_latest_high_match_lead'], (res) => {
      const config = res.radarConfig;
      const latestLead = res.sjg_latest_high_match_lead;
      if (config && config.enabled && config.desktopNotifications && latestLead && latestLead.title) {
        const minScore = Number(config.minScore || 80);
        if (Number(latestLead.score || 0) >= minScore) {
          showScoutNotification({
            title: `🎯 ${latestLead.score}% High-Match Lead Saved`,
            message: `${latestLead.company || 'Employer'} — ${latestLead.title}. Click to open Cover Letter & Pivot Studio.`,
            targetUrl: latestLead.url
          });
        }
      }
    });
  }
});

// Notification Dispatch Helper
function showScoutNotification({ title, message, targetUrl }) {
  if (!chrome.notifications) return;

  const notificationId = 'sjg_scout_' + Date.now();
  chrome.storage.local.set({ [`sjg_notif_url_${notificationId}`]: targetUrl || DASHBOARD_BASE_URL });
  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: `[SuperJobGenie] ${title}`,
    message: message,
    contextMessage: 'Autonomous Scout Bot',
    priority: 2
  });
}

// Notification Click Handler
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith('sjg_scout_')) {
    const key = `sjg_notif_url_${notificationId}`;
    chrome.storage.local.get([key], (res) => {
      const dest = res[key] || DASHBOARD_BASE_URL;
      chrome.tabs.create({ url: dest });
      chrome.storage.local.remove([key]);
    });
  }
});

// Message Bridge from Popup / Content Scripts
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'save_high_match_lead' && request.lead) {
    chrome.storage.local.set({ sjg_latest_high_match_lead: request.lead });
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'trigger_radar_test') {
    chrome.storage.local.get(['sjg_latest_high_match_lead'], (res) => {
      const realLead = res.sjg_latest_high_match_lead;
      const title = realLead?.title
        ? `🎯 ${realLead.score || 90}% Match Ready: ${realLead.title}`
        : `🎯 Radar Alert Ready (${request.role || 'Target Role'})`;
      const message = realLead?.title
        ? `${realLead.company || 'Target Employer'} — Open Scout Bot to export CSV/Notion table or copy Cover Letter.`
        : `Browse Indeed, LinkedIn, 104, or Workday and click Scan Page Jobs to capture real matches.`;

      showScoutNotification({
        title,
        message,
        targetUrl: realLead?.url || DASHBOARD_BASE_URL
      });
      sendResponse({ success: true, hasRealLead: Boolean(realLead?.title), timestamp: Date.now() });
    });
    return true;
  }

  if (request.action === 'update_radar_alarm') {
    const { enabled, intervalMinutes } = request;
    if (enabled) {
      chrome.alarms.create(ALARM_NAME, {
        delayInMinutes: 0.5,
        periodInMinutes: Math.max(1, intervalMinutes || 60)
      });
    } else {
      chrome.alarms.clear(ALARM_NAME);
    }
    sendResponse({ success: true, enabled });
    return true;
  }
});
