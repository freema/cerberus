/**
 * MergeRequest model class
 */
const path = require('path');
const BaseModel = require('./BaseModel');
const config = require('../utils/config');
const fileSystem = require('../utils/fileSystem');
const logger = require('../utils/logger');

class MergeRequest extends BaseModel {
  /**
   * Create a new MergeRequest instance
   * @param {Object} data - Merge request data
   */
  constructor(data = {}) {
    const id = data.id || `mr_${Date.now()}`;
    super('merge-requests', id, data);
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
    return path.join(config.getDataPathForType('merge-requests'), `${this.id}.json`);
  }

  /**
   * Get the cached file path for this merge request
   * @returns {string} - Path to the cached merge request file
   */
  getCacheFilePath() {
    return path.join(config.getCachePathForType('merge-requests'), `${this.id}.json`);
  }

  /**
   * Convert to JSON representation
   * @returns {Object} - JSON representation of the merge request
   */
  toJSON() {
    return {
      ...super.toJSON(),
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
      review: this.review,
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
      // First try to load from data directory
      const filePath = path.join(config.getDataPathForType('merge-requests'), `${id}.json`);

      try {
        const data = await fileSystem.readJson(filePath);
        return new MergeRequest(data);
      } catch (dataError) {
        // If not in data directory, try cache directory
        logger.debug(`Merge request not found in data directory, trying cache directory...`);
        const cacheFilePath = path.join(config.getCachePathForType('merge-requests'), `${id}.json`);

        const data = await fileSystem.readJson(cacheFilePath);

        // Create new merge request and migrate to data directory
        const mergeRequest = new MergeRequest(data);
        logger.info(`Migrating merge request ${id} from cache to data directory...`);
        await mergeRequest.save();

        return mergeRequest;
      }
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
      // Get merge requests from both data and cache directories
      let dataFiles = [];
      let cacheFiles = [];

      try {
        dataFiles = await fileSystem.listFiles(config.getDataPathForType('merge-requests'));
      } catch (error) {
        logger.debug('No data merge-requests directory or error reading it');
      }

      try {
        cacheFiles = await fileSystem.listFiles(config.getCachePathForType('merge-requests'));
      } catch (error) {
        logger.debug('No cache merge-requests directory or error reading it');
      }

      // Combine files from both directories
      const allFiles = [...dataFiles, ...cacheFiles];

      // Filter and remove duplicates and .json extension
      return [
        ...new Set(
          allFiles.filter(file => file.endsWith('.json')).map(file => file.replace('.json', ''))
        ),
      ];
    } catch (error) {
      logger.error('Error listing merge requests:', error);
      return [];
    }
  }
}

module.exports = MergeRequest;
