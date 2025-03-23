const path = require('path');
const config = require('../utils/config');
const fileSystem = require('../utils/fileSystem');
const logger = require('../utils/logger');

/**
 * MergeRequest model class
 */
class MergeRequest {
  /**
   * Create a new MergeRequest instance
   * @param {Object} data - Merge request data
   */
  constructor(data = {}) {
    this.id = data.id || `mr_${Date.now()}`;
    this.url = data.url || '';
    this.projectId = data.projectId || null;
    this.projectPath = data.projectPath || '';
    this.mergeRequestIid = data.mergeRequestIid || null;
    this.sourceBranch = data.sourceBranch || '';
    this.targetBranch = data.targetBranch || '';
    this.title = data.title || '';
    this.description = data.description || '';
    this.author = data.author || null;
    this.webUrl = data.webUrl || '';
    this.changes = data.changes || [];
    this.supportedExtensions = data.supportedExtensions || [];
    this.totalChangedFiles = data.totalChangedFiles || 0;
    this.supportedChangedFiles = data.supportedChangedFiles || 0;
    this.timestamp = data.timestamp || new Date().toISOString();
    this.review = data.review || '';
  }

  /**
   * Get the file path for this merge request
   * @returns {string} - Path to the merge request file
   */
  getFilePath() {
    return path.join(
      config.getCachePathForType('merge-requests'),
      `${this.id}.json`
    );
  }

  /**
   * Save the merge request
   * @returns {Promise<void>}
   */
  async save() {
    try {
      await fileSystem.saveToJson(this.getFilePath(), this.toJSON());
    } catch (error) {
      logger.error(`Error saving merge request ${this.id}:`, error);
      throw error;
    }
  }

  /**
   * Convert to JSON representation
   * @returns {Object} - JSON representation of the merge request
   */
  toJSON() {
    return {
      id: this.id,
      url: this.url,
      projectId: this.projectId,
      projectPath: this.projectPath,
      mergeRequestIid: this.mergeRequestIid,
      sourceBranch: this.sourceBranch,
      targetBranch: this.targetBranch,
      title: this.title,
      description: this.description,
      author: this.author,
      webUrl: this.webUrl,
      changes: this.changes,
      supportedExtensions: this.supportedExtensions,
      totalChangedFiles: this.totalChangedFiles,
      supportedChangedFiles: this.supportedChangedFiles,
      timestamp: this.timestamp,
      review: this.review
    };
  }

  /**
   * Set the AI review for this merge request
   * @param {string} review - AI-generated review
   */
  setReview(review) {
    this.review = review;
  }

  /**
   * Load a merge request by ID
   * @param {string} id - Merge request ID
   * @returns {Promise<MergeRequest>} - Loaded merge request
   */
  static async load(id) {
    try {
      const filePath = path.join(config.getCachePathForType('merge-requests'), `${id}.json`);
      const data = await fileSystem.readJson(filePath);
      return new MergeRequest(data);
    } catch (error) {
      logger.error(`Error loading merge request ${id}:`, error);
      throw error;
    }
  }

  /**
   * List all merge requests
   * @returns {Promise<string[]>} - Array of merge request IDs
   */
  static async listAll() {
    try {
      const files = await fileSystem.listFiles(config.getCachePathForType('merge-requests'));
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch (error) {
      logger.error('Error listing merge requests:', error);
      return [];
    }
  }
}

module.exports = MergeRequest;