import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, LayoutChangeEvent } from 'react-native';
import { useTheme } from '../../theme';

interface Tab {
  key: string;
  label: string;
  badge?: number;
}

interface TabSwitchProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  /** Container border radius (varsayılan: theme radius.lg) */
  containerRadius?: number;
  /** Arka plan rengi */
  containerBgColor?: string;
  /** Seçili sekme göstergesi (kayan pill) rengi */
  indicatorColor?: string;
  /** Sekme yazı rengi (seçili değilken) */
  textColor?: string;
  /** Seçili sekme yazı rengi */
  activeTextColor?: string;
}

export const TabSwitch: React.FC<TabSwitchProps> = ({
  tabs,
  activeTab,
  onTabChange,
  containerRadius,
  containerBgColor,
  indicatorColor,
  textColor,
  activeTextColor,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const containerRadiusValue = containerRadius ?? radius.lg;
  const bgColor = containerBgColor ?? colors.surfaceSecondary;
  const indColor = indicatorColor ?? colors.surface;
  const inactiveColor = textColor ?? colors.textSecondary;
  const activeColor = activeTextColor ?? colors.text;
  const translateX = useRef(new Animated.Value(0)).current;
  const containerWidth = useRef(0);

  const activeIndex = tabs.findIndex((t) => t.key === activeTab);
  const tabWidth = containerWidth.current / tabs.length;

  useEffect(() => {
    if (containerWidth.current > 0) {
      Animated.spring(translateX, {
        toValue: activeIndex * tabWidth + 2,
        useNativeDriver: true,
        tension: 100,
        friction: 15,
      }).start();
    }
  }, [activeIndex, tabWidth]);

  const onLayout = (e: LayoutChangeEvent) => {
    containerWidth.current = e.nativeEvent.layout.width;
    const tw = e.nativeEvent.layout.width / tabs.length;
    translateX.setValue(activeIndex * tw + 2);
  };

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          borderRadius: containerRadiusValue,
          padding: 2,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.indicator,
          {
            width: tabWidth - 4,
            backgroundColor: indColor,
            borderRadius: containerRadiusValue - 2,
            transform: [{ translateX }],
          },
        ]}
      />
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          onPress={() => onTabChange(tab.key)}
          style={[styles.tab, { flex: 1 }]}
          activeOpacity={0.7}
        >
          <Text
            style={[
              typography.bodySmall,
              {
                fontWeight: activeTab === tab.key ? '700' : '500',
                color: activeTab === tab.key ? activeColor : inactiveColor,
                textAlign: 'center',
              },
            ]}
          >
            {tab.label}
          </Text>
          {tab.badge !== undefined && tab.badge > 0 && activeTab !== tab.key && (
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    top: 6,
    right: '25%',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
