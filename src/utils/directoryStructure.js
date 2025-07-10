/**
 * Directory structure generation utility
 * Shared function for generating directory structure documentation
 */
const path = require('path');

/**
 * Generate a directory structure string for Claude instructions
 * @param {Array} files - Array of file objects
 * @returns {string} - Formatted directory structure
 */
function generateDirectoryStructure(files) {
  let directoryStructure = `# Project Structure and File Mapping\n\n`;

  // Part 1: Original directory structure by source directory
  directoryStructure += `## Original Directory Structure\n\n`;

  // Group files by their original directories
  const filesBySourceDir = {};

  files.forEach(file => {
    // Skip if missing source information
    if (!file.originalDirectory) return;

    if (!filesBySourceDir[file.originalDirectory]) {
      filesBySourceDir[file.originalDirectory] = [];
    }

    filesBySourceDir[file.originalDirectory].push(file);
  });

  // Output organized by source directories
  Object.keys(filesBySourceDir)
    .sort()
    .forEach(dir => {
      directoryStructure += `### ${dir}\n\n`;

      const filesInDir = filesBySourceDir[dir].sort((a, b) =>
        path.basename(a.originalPath).localeCompare(path.basename(b.originalPath))
      );

      filesInDir.forEach(file => {
        const fileName = path.basename(file.originalPath);
        directoryStructure += `- ${fileName}\n`;
      });

      directoryStructure += '\n';
    });

  // Part 2: Flat file structure in the project
  directoryStructure += `## Project Files (Flattened Structure)\n\n`;
  directoryStructure += `All files are stored with flattened names in the project directory.\n\n`;

  // Part 3: File mapping between original and project paths
  directoryStructure += `## File Mapping\n\n`;
  directoryStructure += `Original Path → Project Path\n\n`;

  // Sort files alphabetically by original path for easier reference
  const sortedFiles = [...files].sort((a, b) => {
    const aPath = a.fullOriginalPath || a.originalPath;
    const bPath = b.fullOriginalPath || b.originalPath;
    return aPath.localeCompare(bPath);
  });

  sortedFiles.forEach(file => {
    const origPath = file.fullOriginalPath || file.originalPath;
    directoryStructure += `- \`${origPath}\` → \`${file.newPath}\`\n`;
  });

  // Add path reference section formatted specifically for AI context
  directoryStructure += `\n## Path Reference for Claude AI\n\n`;
  directoryStructure += `IMPORTANT: When referring to files in your responses, ALWAYS use the original file paths (left side) instead of flattened names (right side).\n`;
  directoryStructure += `When discussing code or files, reference them by their original location in the project structure.\n`;
  directoryStructure += `For example, refer to a component as "src/containers/UserProfile.tsx" not as "src_containers_UserProfile.tsx".\n\n`;
  directoryStructure += `Path reference:\n`;

  sortedFiles.forEach(file => {
    const origPath = file.originalPath;
    // Include the full path for proper project structure context
    directoryStructure += `${origPath} -> ${file.newPath}\n`;
  });

  // Part 4: File statistics
  const extensions = {};
  files.forEach(file => {
    const ext = path.extname(file.originalPath);
    extensions[ext] = (extensions[ext] || 0) + 1;
  });

  directoryStructure += `\n## File Statistics\n\n`;
  directoryStructure += `Total files: ${files.length}\n\n`;
  directoryStructure += `Files by extension:\n`;

  Object.entries(extensions)
    .sort((a, b) => b[1] - a[1]) // Sort by count descending
    .forEach(([ext, count]) => {
      directoryStructure += `- ${ext || '(no extension)'}: ${count}\n`;
    });

  return directoryStructure;
}

module.exports = {
  generateDirectoryStructure,
};
