/**
 * Service for interacting with Jira API
 */
const BaseApiService = require('./BaseApiService');
const logger = require('../utils/logger');
const config = require('../utils/config');
const path = require('path');
const fs = require('fs-extra');
const pathHelper = require('../utils/pathHelper');

class JiraService extends BaseApiService {
  constructor() {
    super('Jira');
  }

  /**
   * Initialize the Jira API client
   */
  initializeClient() {
    const token = config.getJiraToken();
    const jiraConfig = config.getJiraConfig();
    this.baseUrl = jiraConfig.baseUrl;
    this.username = jiraConfig.username;

    // Vytvoříme klienta s autentizačními údaji
    const options = {
      timeout: jiraConfig.timeout || 10000,
      auth: null
    };
    
    // Nastavíme autentizaci - pro Jira potřebujeme username a token
    if (token && this.username) {
      // Použijeme standardní auth objekt v axios, který vytvoří Basic auth
      options.auth = {
        username: this.username,
        password: token
      };
      
      if (config.isDebugMode()) {
        logger.debug(`Using Basic Auth with username: ${this.username}`);
        logger.debug('Token is provided (hidden)');
      }
    } else if (token) {
      // Nemáme username, zkusíme token jako Bearer token
      const headers = {
        Authorization: `Bearer ${token}`
      };
      
      this.createClient(this.baseUrl, headers, options);
      return;
    } else if (config.isDebugMode()) {
      logger.debug('No authentication token provided');
    }
    
    // Vytvoříme klienta bez Authorization hlavičky, ale s auth objektem
    this.createClient(this.baseUrl, {}, options);
  }

  /**
   * Perform test request for the Jira API
   * @returns {Promise<Object>} - API response
   */
  async performTestRequest() {
    try {
      // We test with the myself endpoint which is usually available on most Jira instances
      const response = await this.client.get('/rest/api/2/myself');
      logger.debug(`Jira API test: ${JSON.stringify(response.data)}`);
      logger.info(`Připojení úspěšné - přihlášen jako: ${response.data.displayName || response.data.name || 'Unknown'}`);
      logger.info(`Email: ${response.data.emailAddress || 'nedostupný'}`);
      return response;
    } catch (error) {
      // Vždy zobrazíme hlavní detaily chyby
      logger.error(`Chyba připojení k Jira API: ${error.message}`);
      logger.error(`Stavový kód: ${error.response?.status || 'neznámý'}`);
      
      // Kontrola konfigurace
      const jiraConfig = config.getJiraConfig();
      logger.error('Současná konfigurace:');
      logger.error(`- URL: ${this.baseUrl}`);
      logger.error(`- Username: ${jiraConfig.username || 'není nastaven!'}`);
      logger.error(`- Token: ${config.getJiraToken() ? 'nastaven' : 'není nastaven!'}`);
      
      // Podrobnější vysvětlení nejčastějších problémů
      if (error.response?.status === 403) {
        logger.error('Chyba 403 Forbidden - nemáte oprávnění nebo je token neplatný');
        logger.error('Zkontrolujte, zda:');
        logger.error('1. Váš uživatelský účet má přístup k Jira API');
        logger.error('2. Token je platný a správně zadaný');
        logger.error('3. Username je správně zadán (email, kterým se přihlašujete do Jira)');
      } else if (error.response?.status === 401) {
        logger.error('Chyba 401 Unauthorized - neplatná autentizace');
        logger.error('Zkontrolujte, zda:');
        logger.error('1. Username je správně zadán (email, kterým se přihlašujete do Jira)');
        logger.error('2. Token je platný a správně zadaný');
        logger.error('Pro Jira Cloud můžete vygenerovat API token zde: https://id.atlassian.com/manage-profile/security/api-tokens');
      } else if (error.response?.status === 404) {
        logger.error('Chyba 404 Not Found - endpoint nebyl nalezen');
        logger.error('Zkontrolujte, zda je URL správná a směřuje na Jira instanci.');
        logger.error(`Testovaná URL: ${this.baseUrl}/rest/api/2/myself`);
        logger.error('Ujistěte se, že URL neobsahuje /rest/api/... - to se přidává automaticky');
      }
      
      // Podrobnější logování chyby pro debug režim
      if (config.isDebugMode()) {
        logger.debug('==== Jira API connection error details ====');
        logger.debug(`Status: ${error.response?.status || 'unknown'}`);
        logger.debug(`Status text: ${error.response?.statusText || 'unknown'}`);
        logger.debug(`Error message: ${error.message}`);
        
        if (error.response?.headers) {
          logger.debug('Response headers:');
          Object.entries(error.response.headers).forEach(([key, value]) => {
            logger.debug(`${key}: ${value}`);
          });
        }
        
        if (error.response?.data) {
          logger.debug('Response data:');
          logger.debug(JSON.stringify(error.response.data, null, 2));
        }
        
        // Kontrola autorizace
        const token = config.getJiraToken();
        if (token) {
          logger.debug(`Authorization header type: ${token.includes(':') ? 'Basic Auth' : 'Bearer'}`);
          if (token.includes('@') && token.includes(':')) {
            const parts = token.split(':');
            logger.debug(`Auth format: email:token (email part: ${parts[0]})`);
          }
        } else {
          logger.debug('No authorization token provided');
        }
        
        logger.debug(`Base URL: ${this.baseUrl}`);
        logger.debug('========================================');
      }
      throw error;
    }
  }

  /**
   * Update the Jira token
   * @param {string} token - New Jira token
   */
  updateToken(token) {
    config.setJiraToken(token);
    this.initializeClient();
  }

  /**
   * Update the Jira base URL
   * @param {string} baseUrl - New Jira base URL
   */
  updateBaseUrl(baseUrl) {
    // Make sure the URL doesn't end with a trailing slash
    const normalizedUrl = baseUrl.endsWith('/')
      ? baseUrl.slice(0, -1)
      : baseUrl;

    config.setJiraConfig({ ...config.getJiraConfig(), baseUrl: normalizedUrl });
    this.initializeClient();
  }
  
  /**
   * Update the Jira username
   * @param {string} username - New Jira username (typically email)
   */
  updateUsername(username) {
    config.setJiraConfig({ ...config.getJiraConfig(), username });
    this.initializeClient();
  }

  /**
   * Check if Jira token is configured
   * @returns {boolean} - Whether the token is configured
   */
  isConfigured() {
    const token = config.getJiraToken();
    const username = config.getJiraConfig().username;
    return !!token && !!username;
  }

  /**
   * Parse a Jira task URL
   * @param {string} url - Jira task URL
   * @returns {Object|null} - Object with issueKey or null if invalid
   */
  parseJiraUrl(url) {
    try {
      // Parse URL string
      const urlObj = new URL(url);
      
      // Extract the issue key from the URL path
      const pathParts = urlObj.pathname.split('/');
      const browseIndex = pathParts.findIndex(part => part === 'browse');
      
      if (browseIndex === -1 || browseIndex === pathParts.length - 1) {
        logger.error('Invalid Jira URL format');
        return null;
      }
      
      // The issue key should be the part after 'browse'
      const issueKey = pathParts[browseIndex + 1];
      
      if (!issueKey || !issueKey.includes('-')) {
        logger.error('Invalid Jira issue key');
        return null;
      }
      
      return { issueKey };
    } catch (error) {
      logger.error('Error parsing Jira URL:', error);
      return null;
    }
  }

  /**
   * Get issue details from Jira
   * @param {string} issueKey - Jira issue key (e.g. PROJECT-123)
   * @returns {Promise<Object|null>} - Issue details or null if not found
   */
  async getIssue(issueKey) {
    return this.executeRequest(
      async () => {
        const response = await this.client.get(
          `/rest/api/2/issue/${issueKey}?expand=renderedFields,subtasks,comment`
        );
        return response.data;
      },
      `Error getting issue ${issueKey}`,
      null
    );
  }

  /**
   * Get linked issues for a specific issue with specified depth limit
   * @param {string} issueKey - Jira issue key
   * @param {number} depth - Maximum depth to traverse (to avoid infinite recursion)
   * @param {Set} processedKeys - Already processed keys (to avoid circular references)
   * @returns {Promise<Array|null>} - Array of linked issues or null if error
   */
  async getLinkedIssues(issueKey, depth = 2, processedKeys = new Set()) {
    // Stop recursion if we reached maximum depth or already processed this issue
    if (depth <= 0 || processedKeys.has(issueKey)) {
      return [];
    }
    
    // Add current key to processed set
    processedKeys.add(issueKey);
    
    // First get the main issue to find issue links
    const issue = await this.getIssue(issueKey);
    if (!issue || !issue.fields || !issue.fields.issuelinks) {
      return null;
    }

    const linkedIssueKeys = issue.fields.issuelinks
      .filter(link => link.inwardIssue || link.outwardIssue)
      .map(link => {
        const linkedKey = link.inwardIssue ? link.inwardIssue.key : link.outwardIssue.key;
        // Prepare link type information
        const linkType = link.type ? link.type.name : 'linked';
        const direction = link.inwardIssue ? 'inward' : 'outward';
        return { 
          key: linkedKey, 
          type: linkType,
          direction,
          description: direction === 'inward' ? link.type?.inward : link.type?.outward
        };
      });

    if (linkedIssueKeys.length === 0) {
      return [];
    }

    // Get linked issues with their nested linked issues
    const result = [];
    
    // For each linked issue, get its data and recursively its linked issues
    for (const linkInfo of linkedIssueKeys) {
      // Skip already processed issues
      if (processedKeys.has(linkInfo.key)) {
        continue;
      }
      
      // Get the issue
      const linkedIssue = await this.getIssue(linkInfo.key);
      
      if (linkedIssue) {
        // Recursively get linked issues (with reduced depth)
        const nestedLinkedIssues = await this.getLinkedIssues(
          linkInfo.key, 
          depth - 1, 
          new Set(processedKeys)
        );
        
        // Add information about the issue including its linked issues
        result.push({
          key: linkedIssue.key,
          summary: linkedIssue.fields.summary,
          description: linkedIssue.renderedFields?.description || linkedIssue.fields.description || '',
          status: linkedIssue.fields.status?.name || '',
          linkType: linkInfo.type,
          linkDirection: linkInfo.direction,
          linkDescription: linkInfo.description,
          comments: (linkedIssue.fields.comment?.comments || []).map(c => ({
            author: c.author?.displayName || '',
            created: c.created,
            body: c.body
          })),
          linkedIssues: nestedLinkedIssues || []
        });
      }
    }
    
    return result;
  }

  /**
   * Create a JSON summary of an issue including subtasks and linked issues
   * @param {string} issueKey - Jira issue key
   * @param {number} depth - Maximum depth for linked issues traversal
   * @returns {Promise<Object|null>} - JSON summary or null if error
   */
  async createIssueSummary(issueKey, depth = 3) {
    const mainIssue = await this.getIssue(issueKey);
    if (!mainIssue) {
      return null;
    }

    // Get subtasks from the main issue
    const subtasks = mainIssue.fields.subtasks || [];
    const subtaskKeys = subtasks.map(subtask => subtask.key);
    
    // Get full subtask data
    const subtaskPromises = subtaskKeys.map(async key => {
      const subtask = await this.getIssue(key);
      if (!subtask) return null;
      
      // Pro každý podúkol získáme i propojené úkoly
      const linkedIssues = await this.getLinkedIssues(key, 1); // Omezená hloubka pro podúkoly
      
      return {
        key: subtask.key,
        summary: subtask.fields.summary,
        description: subtask.renderedFields?.description || subtask.fields.description || '',
        status: subtask.fields.status?.name || '',
        priority: subtask.fields.priority?.name || '',
        assignee: subtask.fields.assignee?.displayName || '',
        reporter: subtask.fields.reporter?.displayName || '',
        created: subtask.fields.created,
        updated: subtask.fields.updated,
        comments: (subtask.fields.comment?.comments || []).map(c => ({
          author: c.author?.displayName || '',
          created: c.created,
          body: c.body
        })),
        linkedIssues: linkedIssues || []
      };
    });
    const subtaskData = await Promise.all(subtaskPromises);
    
    // Get linked issues with specified depth
    const linkedIssues = await this.getLinkedIssues(issueKey, depth);

    // Extract metadata fields
    const extractFields = (issue) => {
      const fields = issue.fields || {};
      return {
        type: fields.issuetype?.name || '',
        priority: fields.priority?.name || '',
        assignee: fields.assignee?.displayName || '',
        reporter: fields.reporter?.displayName || '',
        labels: fields.labels || [],
        components: (fields.components || []).map(c => c.name),
        fixVersions: (fields.fixVersions || []).map(v => v.name),
        // Další metadata, která mohou být užitečná
        dueDate: fields.dueDate || null,
        resolution: fields.resolution?.name || null,
        environment: fields.environment || '',
        epic: fields.epic?.name || fields.customfield_10014 || '', // Obvyklé pole pro epicy v Jira
        storyPoints: fields.customfield_10016 || null,
        sprint: fields.sprint?.name || fields.customfield_10020 || null
      };
    };

    // Create a summary focusing on text content with improved structure
    const summary = {
      // Základní info
      key: mainIssue.key,
      summary: mainIssue.fields.summary,
      description: mainIssue.renderedFields?.description || mainIssue.fields.description || '',
      status: mainIssue.fields.status?.name || '',
      
      // Metadata
      ...extractFields(mainIssue),
      
      // Časové údaje
      created: mainIssue.fields.created,
      updated: mainIssue.fields.updated,
      
      // Komentáře
      comments: (mainIssue.fields.comment?.comments || []).map(c => ({
        author: c.author?.displayName || '',
        email: c.author?.emailAddress || '',
        created: c.created,
        body: c.body || c.renderedBody || ''
      })),
      
      // Podúkoly a propojené úkoly
      subtasks: subtaskData.filter(Boolean),
      linkedIssues: linkedIssues || [],
      
      // Užitečné počty pro shrnutí
      counts: {
        subtasks: subtaskData.filter(Boolean).length,
        linkedIssues: (linkedIssues || []).length,
        comments: (mainIssue.fields.comment?.comments || []).length
      }
    };

    return summary;
  }

  /**
   * Save issue summary to a file
   * @param {string} issueKey - Jira issue key
   * @param {Object} summary - Issue summary
   * @param {string} aiAnalysis - Optional AI analysis text
   * @returns {Promise<Object|null>} - Object with paths to saved files or null if error
   */
  async saveSummaryToFile(issueKey, summary, aiAnalysis = null) {
    try {
      // Ensure the jira directory exists
      const jiraDataDir = pathHelper.getDataPathForType('jira');
      await fs.ensureDir(jiraDataDir);
      
      // Create filename from issue key and current date
      const date = new Date().toISOString().replace(/[:.]/g, '-');
      const jsonFilename = `${issueKey}-${date}.json`;
      const jsonFilePath = path.join(jiraDataDir, jsonFilename);
      
      // Write the summary to JSON file
      await fs.writeJson(jsonFilePath, summary, { spaces: 2 });
      logger.success(`Saved Jira summary to ${jsonFilePath}`);
      
      // If AI analysis is provided, save it to a separate text file
      let txtFilePath = null;
      if (aiAnalysis) {
        const txtFilename = `${issueKey}-${date}-analysis.md`;
        txtFilePath = path.join(jiraDataDir, txtFilename);
        
        // Create a nice formatted Markdown file
        const mdContent = `# AI Analysis of Jira Task ${issueKey}
Date: ${new Date().toLocaleString()}

## Analysis

${aiAnalysis}

## Source

This analysis was generated based on data from Jira task ${issueKey} and its related tasks.
`;
        
        await fs.writeFile(txtFilePath, mdContent, 'utf8');
        logger.success(`Saved AI analysis to ${txtFilePath}`);
      }
      
      return {
        jsonPath: jsonFilePath,
        analysisPath: txtFilePath
      };
    } catch (error) {
      logger.error('Error saving Jira summary to file:', error);
      return null;
    }
  }
}

module.exports = new JiraService();