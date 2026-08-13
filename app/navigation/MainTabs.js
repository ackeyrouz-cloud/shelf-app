import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../theme/colors';
import { FONTS } from '../theme/fonts';
import { ShelfScreen } from '../screens/shelf/ShelfScreen';
import { RecipesScreen } from '../screens/recipes/RecipesScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

// Each tab gets its own color identity (Liftoff-style) rather than one
// accent for every active state, and swaps to a filled glyph when active
// (Ionicons ships outline/filled pairs) so the state change isn't hue alone.
const TAB_CONFIG = {
  Shelf: { icon: 'archive', iconOutline: 'archive-outline', color: COLORS.primary },
  Recipes: { icon: 'restaurant', iconOutline: 'restaurant-outline', color: COLORS.success },
  Profile: { icon: 'person-circle', iconOutline: 'person-circle-outline', color: COLORS.fat },
};

function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

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
            <Ionicons
              name={focused ? config.icon : config.iconOutline}
              size={24}
              color={focused ? config.color : COLORS.inkMuted}
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

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
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
    color: COLORS.inkMuted,
  },
});
