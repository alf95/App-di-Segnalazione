const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [
  projectRoot,
  path.resolve(workspaceRoot, 'packages'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.blockList = [
  // Keep the default SDK 54 exclusion: regenerated .expo/types trigger unwanted fast refresh.
  /\.expo[\\/]types/,
  /node_modules[/\\](?!@urbanreport)[/\\].*[/\\]node_modules/,
];

module.exports = config;
