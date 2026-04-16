import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Colors, FontSize, FontWeight, BorderRadius, Shadows } from '@/constants/theme';

// ─── Premium Neon Tab Icon ───────────────────────────────────────────────────

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <View
      style={styles.tabItem}
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
    >
      {/* Active: neon pill behind icon */}
      {focused && <View style={styles.activePill} />}
      <Text style={[styles.icon, focused && styles.iconActive]}>{icon}</Text>
      <Text
        style={[styles.label, focused && styles.labelActive]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
      {/* Active dot indicator */}
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

// ─── Scan Tab — Special center FAB style ─────────────────────────────────────

function ScanTabIcon({ focused }: { focused: boolean }) {
  return (
    <View style={styles.scanWrapper}>
      <View style={[styles.scanBtn, focused && styles.scanBtnActive]}>
        <View style={styles.scanInner}>
          <Text style={{ fontSize: 26 }}>📸</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Tab Layout ──────────────────────────────────────────────────────────────

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🏠" label="Ana Sayfa" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="📋" label="Geçmiş" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          tabBarIcon: ({ focused }) => <ScanTabIcon focused={focused} />,
          tabBarStyle: { display: 'none' }, // hide bar on scan screen
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="📊" label="Raporlar" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="👥" label="Topluluk" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="👤" label="Profil" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(13,13,18,0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    height: 80,
    paddingBottom: 10,
    paddingTop: 4,
    // Neon shadow upward
    shadowColor: Colors.neon.lime,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
    paddingTop: 4,
    position: 'relative',
  },
  activePill: {
    position: 'absolute',
    top: 0,
    width: 48,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.neon.limeGlow,
  },
  icon: {
    fontSize: 22,
    opacity: 0.4,
  },
  iconActive: {
    opacity: 1,
  },
  label: {
    fontSize: 10,
    marginTop: 3,
    color: Colors.text.muted,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
  },
  labelActive: {
    color: Colors.neon.lime,
    fontWeight: FontWeight.bold,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.neon.lime,
    marginTop: 2,
  },

  // ── Scan FAB ───────────────────────────────────────────────────────
  scanWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  scanBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  scanBtnActive: {
    borderColor: Colors.neon.lime,
    shadowColor: Colors.neon.lime,
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  scanInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
