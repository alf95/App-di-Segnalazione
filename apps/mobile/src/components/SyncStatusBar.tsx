import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Surface, Text } from 'react-native-paper';

interface SyncStatusBarProps {
  pendingCount: number;
  isSyncing: boolean;
}

export const SyncStatusBar = ({ pendingCount, isSyncing }: SyncStatusBarProps) => {
  if (pendingCount <= 0 && !isSyncing) {
    return null;
  }

  return (
    <Surface style={styles.container} elevation={1}>
      <View style={styles.content}>
        <Text>{pendingCount} reports pending sync</Text>
        {isSyncing ? <ActivityIndicator size="small" /> : null}
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 12,
    borderRadius: 12,
    padding: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
