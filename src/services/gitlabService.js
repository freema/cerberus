const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../utils/config');

/**
 * Service for interacting with GitLab API
 */
class GitlabService {
  constructor() {
    this.initializeClient();
  }

  /**
   * Initialize the GitLab API client
   */
  initializeClient() {
    const token = config.getGitlabToken();
    const gitlabConfig = config.getGitlabConfig();

    this.baseUrl = gitlabConfig.baseUrl;
    
    // Create GitLab API client
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: gitlabConfig.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
  }

  /**
   * Test the GitLab API connection
   * @returns {Promise<boolean>} - Whether the connection is working
   */
  async testConnection() {
    try {
      // A simple endpoint that should be available on any GitLab instance
      const response = await this.client.get('/version');
      logger.debug(`GitLab API version: ${JSON.stringify(response.data)}`);
      return true;
    } catch (error) {
      logger.error('Failed to connect to GitLab API:', error);
      return false;
    }
  }

  /**
   * Update the GitLab token
   * @param {string} token - New GitLab token
   */
  updateToken(token) {
    config.setGitlabToken(token);
    this.initializeClient();
  }

  /**
   * Update the GitLab base URL
   * @param {string} baseUrl - New GitLab base URL
   */
  updateBaseUrl(baseUrl) {
    // Make sure the URL ends with /api/v4
    const normalizedUrl = baseUrl.endsWith('/api/v4') 
      ? baseUrl 
      : baseUrl.endsWith('/') 
        ? `${baseUrl}api/v4` 
        : `${baseUrl}/api/v4`;
    
    config.setGitlabConfig({ ...config.getGitlabConfig(), baseUrl: normalizedUrl });
    this.initializeClient();
  }

  /**
   * Check if GitLab token is configured
   * @returns {boolean} - Whether the token is configured
   */
  isConfigured() {
    return !!config.getGitlabToken();
  }

  /**
   * Get project ID from GitLab
   * @param {string} projectPath - Path to the project (e.g. 'group/project')
   * @returns {Promise<number|null>} - Project ID or null if not found
   */
  async getProjectId(projectPath) {
    try {
      const encodedPath = encodeURIComponent(projectPath);
      const response = await this.client.get(`/projects/${encodedPath}`);
      return response.data.id;
    } catch (error) {
      logger.error(`Error getting project ID for ${projectPath}:`, error);
      return null;
    }
  }

  /**
   * Get merge request details from GitLab
   * @param {number} projectId - Project ID
   * @param {number} mergeRequestIid - Merge request IID (internal ID)
   * @returns {Promise<Object|null>} - Merge request details or null if not found
   */
  async getMergeRequest(projectId, mergeRequestIid) {
    try {
      const response = await this.client.get(`/projects/${projectId}/merge_requests/${mergeRequestIid}`);
      return response.data;
    } catch (error) {
      logger.error(`Error getting merge request #${mergeRequestIid}:`, error);
      return null;
    }
  }

  /**
   * Get changes in a merge request
   * @param {number} projectId - Project ID
   * @param {number} mergeRequestIid - Merge request IID (internal ID)
   * @returns {Promise<Array|null>} - Array of changes or null if error
   */
  async getMergeRequestChanges(projectId, mergeRequestIid) {
    try {
      const response = await this.client.get(`/projects/${projectId}/merge_requests/${mergeRequestIid}/changes`);
      return response.data.changes;
    } catch (error) {
      logger.error(`Error getting changes for merge request #${mergeRequestIid}:`, error);
      return null;
    }
  }

  /**
   * Get file content from a specific branch
   * @param {number} projectId - Project ID
   * @param {string} filePath - Path to the file
   * @param {string} ref - Branch or commit reference
   * @returns {Promise<string|null>} - File content or null if error
   */
  async getFileContent(projectId, filePath, ref = 'master') {
    try {
      const response = await this.client.get(`/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}/raw`, {
        params: { ref }
      });
      return response.data;
    } catch (error) {
      logger.error(`Error getting file content for ${filePath} (${ref}):`, error);
      return null;
    }
  }

  /**
   * Parse a GitLab merge request URL
   * @param {string} url - GitLab merge request URL
   * @returns {Object|null} - Object with projectPath and mergeRequestIid or null if invalid
   */
  parseMergeRequestUrl(url) {
    try {
      // Parse URL string
      const urlObj = new URL(url);
      
      // Extract path parts
      const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
      
      // Check if it's a merge request URL
      if (pathParts.length < 4 || pathParts[pathParts.length - 2] !== 'merge_requests') {
        logger.error('Invalid merge request URL format');
        return null;
      }
      
      // Extract merge request IID
      const mergeRequestIid = parseInt(pathParts[pathParts.length - 1], 10);
      if (isNaN(mergeRequestIid)) {
        logger.error('Invalid merge request ID');
        return null;
      }
      
      // Extract project path
      const projectPathIndex = pathParts.findIndex(part => part === '-');
      if (projectPathIndex === -1) {
        // Simple format: /group/project/-/merge_requests/123
        const projectPath = pathParts.slice(0, pathParts.length - 3).join('/');
        return { projectPath, mergeRequestIid };
      } else {
        // Format with namespace: /namespace/group/project/-/merge_requests/123
        const projectPath = pathParts.slice(0, projectPathIndex).join('/');
        return { projectPath, mergeRequestIid };
      }
    } catch (error) {
      logger.error('Error parsing merge request URL:', error);
      return null;
    }
  }
}

module.exports = new GitlabService();