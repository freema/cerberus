/**
 * Service for interacting with GitLab API
 */
const BaseApiService = require('./BaseApiService');
const logger = require('../utils/logger');
const config = require('../utils/config');

class GitlabService extends BaseApiService {
  constructor() {
    super('GitLab');
  }

  /**
   * Initialize the GitLab API client
   */
  initializeClient() {
    const token = config.getGitlabToken();
    const gitlabConfig = config.getGitlabConfig();
    this.baseUrl = gitlabConfig.baseUrl;

    this.createClient(this.baseUrl, token ? { Authorization: `Bearer ${token}` } : {}, {
      timeout: gitlabConfig.timeout || 10000,
    });
  }

  /**
   * Perform test request for the GitLab API
   * @returns {Promise<Object>} - API response
   */
  async performTestRequest() {
    const response = await this.client.get('/version');
    logger.debug(`GitLab API version: ${JSON.stringify(response.data)}`);
    return response;
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
    return this.executeRequest(
      async () => {
        const encodedPath = encodeURIComponent(projectPath);
        const response = await this.client.get(`/projects/${encodedPath}`);
        return response.data.id;
      },
      `Error getting project ID for ${projectPath}`,
      null
    );
  }

  /**
   * Get merge request details from GitLab
   * @param {number} projectId - Project ID
   * @param {number} mergeRequestIid - Merge request IID (internal ID)
   * @returns {Promise<Object|null>} - Merge request details or null if not found
   */
  async getMergeRequest(projectId, mergeRequestIid) {
    return this.executeRequest(
      async () => {
        const response = await this.client.get(
          `/projects/${projectId}/merge_requests/${mergeRequestIid}`
        );
        return response.data;
      },
      `Error getting merge request #${mergeRequestIid}`,
      null
    );
  }

  /**
   * Get changes in a merge request
   * @param {number} projectId - Project ID
   * @param {number} mergeRequestIid - Merge request IID (internal ID)
   * @param {string} commitId - Optional specific commit SHA
   * @returns {Promise<Array|null>} - Array of changes or null if error
   */
  async getMergeRequestChanges(projectId, mergeRequestIid, commitId = null) {
    return this.executeRequest(
      async () => {
        if (commitId) {
          // If commit ID is provided, get the specific commit changes
          const response = await this.client.get(
            `/projects/${projectId}/repository/commits/${commitId}/diff`
          );
          return response.data;
        } else {
          // Otherwise get all MR changes
          const response = await this.client.get(
            `/projects/${projectId}/merge_requests/${mergeRequestIid}/changes`
          );
          return response.data.changes;
        }
      },
      commitId 
        ? `Error getting changes for commit ${commitId}`
        : `Error getting changes for merge request #${mergeRequestIid}`,
      null
    );
  }

  /**
   * Get file content from a specific branch
   * @param {number} projectId - Project ID
   * @param {string} filePath - Path to the file
   * @param {string} ref - Branch or commit reference
   * @returns {Promise<string|null>} - File content or null if error
   */
  async getFileContent(projectId, filePath, ref = 'master') {
    return this.executeRequest(
      async () => {
        const response = await this.client.get(
          `/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}/raw`,
          {
            params: { ref },
          }
        );
        return response.data;
      },
      `Error getting file content for ${filePath} (${ref})`,
      null
    );
  }

  /**
   * Parse a GitLab merge request URL
   * @param {string} url - GitLab merge request URL
   * @returns {Object|null} - Object with projectPath, mergeRequestIid, and optional commitId
   */
  parseMergeRequestUrl(url) {
    try {
      // Parse URL string
      const urlObj = new URL(url);

      // Extract path parts
      const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);

      // Check if it's a merge request URL
      const mergeRequestsIndex = pathParts.findIndex(part => part === 'merge_requests');
      if (mergeRequestsIndex === -1) {
        logger.error('Invalid merge request URL format - missing "merge_requests"');
        return null;
      }

      // Extract merge request IID
      let mergeRequestIid;
      let mergeRequestIdPart = pathParts[mergeRequestsIndex + 1];
      
      // Handle URLs like /merge_requests/123/diffs
      if (mergeRequestIdPart && !isNaN(parseInt(mergeRequestIdPart, 10))) {
        mergeRequestIid = parseInt(mergeRequestIdPart, 10);
      } else {
        logger.error('Invalid merge request ID');
        return null;
      }

      // Extract project path
      const projectPathIndex = pathParts.findIndex(part => part === '-');
      let projectPath;
      if (projectPathIndex === -1) {
        // Simple format: /group/project/merge_requests/123
        projectPath = pathParts.slice(0, mergeRequestsIndex).join('/');
      } else {
        // Format with namespace: /namespace/group/project/-/merge_requests/123
        projectPath = pathParts.slice(0, projectPathIndex).join('/');
      }

      // Extract commit ID from query parameters if present
      const commitId = urlObj.searchParams.get('commit_id') || null;

      return { projectPath, mergeRequestIid, commitId };
    } catch (error) {
      logger.error('Error parsing merge request URL:', error);
      return null;
    }
  }
}

module.exports = new GitlabService();
