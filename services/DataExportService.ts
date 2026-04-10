import { usePortfolioStore } from '../store/usePortfolioStore';

export const DataExportService = {
  exportData: async () => {
    try {
      // 1. Get data from store
      const state = usePortfolioStore.getState();
      const dataToExport = {
        transactions: state.transactions,
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
      };

      // 2. Define path
      // The user wants a folder "Gainbase". Since we enabled file sharing,
      // the DocumentDirectory is visible as the App's folder in "Files".
      // We will create a "Gainbase" subfolder for organization as requested.
      const fs = FileSystem as any;
      const folderPath = `${fs.documentDirectory}Gainbase`;
      const filePath = `${folderPath}/data.json`;

      // 3. Ensure directory exists
      const dirInfo = await fs.getInfoAsync(folderPath);
      if (!dirInfo.exists) {
        await fs.makeDirectoryAsync(folderPath, { intermediates: true });
      }

      // 4. Write file
      await fs.writeAsStringAsync(
        filePath,
        JSON.stringify(dataToExport, null, 2),
      );

      console.log(
        `[DataExportService] Data exported successfully to ${filePath}`,
      );
      return true;
    } catch (error) {
      console.error('[DataExportService] Failed to export data:', error);
      return false;
    }
  },
};
