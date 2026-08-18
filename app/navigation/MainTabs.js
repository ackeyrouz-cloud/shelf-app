import React, { useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedProps, useSharedValue, withTiming, interpolateColor } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { FONTS } from '../theme/fonts';
import { useTheme } from '../context/ThemeContext';
import { ShelfScreen } from '../screens/shelf/ShelfScreen';
import { RecipesScreen } from '../screens/recipes/RecipesScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();
const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);

// The outline->filled glyph swap is still a hard cut (there's no
// interpolating between two different icon shapes) — only the color
// cross-fades. That alone reads as noticeably smoother than the instant
// color snap it replaces, without needing a custom icon set to animate the
// shape too.
function TabIcon({ focused, activeIcon, inactiveIcon, activeColor, inactiveColor }) {
  const progress = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, { duration: 200 });
  }, [focused]);
  const animatedProps = useAnimatedProps(() => ({
    color: interpolateColor(progress.value, [0, 1], [inactiveColor, activeColor]),
  }));
  return <AnimatedIonicons name={focused ? activeIcon : inactiveIcon} size={24} animatedProps={animatedProps} />;
}

// Each tab gets its own color identity (Liftoff-style) rather than one
// accent for every active state, and swaps to a filled glyph when active
// (Ionicons ships outline/filled pairs) so the state change isn't hue alone.
function tabConfig(colors) {
  return {
    Shelf: { icon: 'archive', iconOutline: 'archive-outline', color: colors.primary },
    Recipes: { icon: 'restaurant', iconOutline: 'restaurant-outline', color: colors.success },
    Profile: { icon: 'person-circle', iconOutline: 'person-circle-outline', color: colors.fat },
  };
}

function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const TAB_CONFIG = tabConfig(colors);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const focused = state.index === index;
        const config = TAB_CONFIG[route.name];

        const onPress = () => {
          Haptics.selectionAsync();
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
          >
            <TabIcon
              focused={focused}
              activeIcon={config.icon}
              inactiveIcon={config.iconOutline}
              activeColor={config.color}
              inactiveColor={colors.inkMuted}
            />
            <Text style={[styles.label, focused && { color: config.color, fontFamily: FONTS.bodyBold }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Shelf" component={ShelfScreen} />
      <Tab.Screen name="Recipes" component={RecipesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function makeStyles(colors) { return StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: colors.inkMuted,
  },
}); }
