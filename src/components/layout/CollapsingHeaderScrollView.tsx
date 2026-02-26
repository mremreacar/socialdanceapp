import React from 'react';
import { View, StyleSheet, ScrollView, ScrollViewProps } from 'react-native';
import { useTheme } from '../../theme';
import { Header } from './Header';

const HEADER_HEIGHT = 60;
const HEADER_TOP_PADDING = 30;
const HEADER_EXTRA_HEIGHT = 100;

type HeaderProps = React.ComponentProps<typeof Header>;

interface CollapsingHeaderScrollViewProps extends Omit<ScrollViewProps, 'onScroll'> {
  headerProps: HeaderProps;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}

export const CollapsingHeaderScrollView: React.FC<CollapsingHeaderScrollViewProps> = ({
  headerProps,
  headerExtra,
  children,
  contentContainerStyle,
  style,
  ...scrollViewProps
}) => {
  const { colors } = useTheme();
  const headerTotal = HEADER_HEIGHT + HEADER_TOP_PADDING + (headerExtra ? HEADER_EXTRA_HEIGHT : 0);

  return (
    <>
      <View style={[styles.headerWrap, { paddingTop: HEADER_TOP_PADDING, backgroundColor: colors.headerBg }]}>
        <Header {...headerProps} />
        {headerExtra && <View style={styles.headerExtra}>{headerExtra}</View>}
      </View>
      <ScrollView
        contentContainerStyle={[
          { paddingTop: headerTotal },
          StyleSheet.flatten(contentContainerStyle),
        ]}
        style={[styles.scroll, style]}
        showsVerticalScrollIndicator={false}
        {...scrollViewProps}
      >
        {children}
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  headerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerExtra: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  scroll: {
    flex: 1,
  },
});
