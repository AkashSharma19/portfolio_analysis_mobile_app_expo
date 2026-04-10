import * as BackgroundTask from 'expo-background-task';
import Constants from 'expo-constants';
import * as TaskManager from 'expo-task-manager';
import { DataExportService } from '../services/DataExportService';

export const BACKGROUND_FETCH_TASK = 'BACKGROUND_DATA_BACKUP';

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const success = await DataExportService.exportData();
    return success
      ? BackgroundTask.BackgroundTaskResult.Success
      : BackgroundTask.BackgroundTaskResult.Failed;
  } catch (error) {
    console.error('[BackgroundTask] Task failed:', error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export const registerBackgroundFetchAsync = async () => {
  if (Constants.appOwnership === 'expo') {
    console.log(
      '[BackgroundTask] Background tasks are not supported in Expo Go. Skipping registration.',
    );
    return;
  }

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_FETCH_TASK,
    );
    if (isRegistered) {
      console.log(
        `[BackgroundTask] Task ${BACKGROUND_FETCH_TASK} is already registered.`,
      );
      return;
    }

    await BackgroundTask.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 24 * 60, // 24 hours in minutes
    });
    console.log(`[BackgroundTask] Task ${BACKGROUND_FETCH_TASK} registered.`);
  } catch (err) {
    console.error(`[BackgroundTask] Task Register failed:`, err);
  }
};

export const unregisterBackgroundFetchAsync = async () => {
  if (Constants.appOwnership === 'expo') {
    return;
  }

  try {
    await BackgroundTask.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
    console.log(`[BackgroundTask] Task ${BACKGROUND_FETCH_TASK} unregistered.`);
  } catch (err) {
    console.error(`[BackgroundTask] Task Unregister failed:`, err);
  }
};
