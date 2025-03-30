/**
 * UIHelper - Centralizovaná třída pro CLI interakce
 * Nahrazuje opakující se inquirer.prompt volání
 */
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const logger = require('./logger');
const i18n = require('./i18n');
const { generateDirectoryLink } = require('./pathUtils');
const clipboard = require('./clipboard');

class UIHelper {
  /**
   * Získá potvrzení od uživatele
   * @param {string} message - Otázka pro uživatele
   * @param {boolean} defaultValue - Výchozí hodnota (true/false)
   * @returns {Promise<boolean>} - Odpověď uživatele
   */
  async confirm(message, defaultValue = true) {
    const { confirmed } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmed',
      message,
      default: defaultValue
    }]);
    return confirmed;
  }

  /**
   * Získá textový vstup od uživatele
   * @param {string} message - Výzva pro uživatele
   * @param {Function|null} validate - Validační funkce
   * @param {string} defaultValue - Výchozí hodnota
   * @returns {Promise<string>} - Vstup od uživatele
   */
  async input(message, validate = null, defaultValue = '') {
    const { value } = await inquirer.prompt([{
      type: 'input',
      name: 'value',
      message,
      validate,
      default: defaultValue
    }]);
    return value;
  }

  /**
   * Získá heslo od uživatele (skryté)
   * @param {string} message - Výzva pro uživatele
   * @param {Function|null} validate - Validační funkce
   * @returns {Promise<string>} - Heslo od uživatele
   */
  async password(message, validate = null) {
    const { value } = await inquirer.prompt([{
      type: 'password',
      name: 'value',
      message,
      validate
    }]);
    return value;
  }

  /**
   * Získá výběr jedné možnosti z nabídky
   * @param {string} message - Výzva pro uživatele
   * @param {Array<Object>} choices - Dostupné možnosti výběru
   * @param {string|null} defaultValue - Výchozí hodnota
   * @returns {Promise<any>} - Vybraná hodnota
   */
  async select(message, choices, defaultValue = null) {
    const { selected } = await inquirer.prompt([{
      type: 'list',
      name: 'selected',
      message,
      choices,
      default: defaultValue
    }]);
    return selected;
  }

  /**
   * Získá výběr více možností z nabídky
   * @param {string} message - Výzva pro uživatele
   * @param {Array<Object>} choices - Dostupné možnosti výběru
   * @param {Array<any>} defaultValue - Výchozí vybrané hodnoty
   * @returns {Promise<Array<any>>} - Vybrané hodnoty
   */
  async multiSelect(message, choices, defaultValue = []) {
    const { selected } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'selected',
      message,
      choices,
      default: defaultValue
    }]);
    return selected;
  }

  /**
   * Zobrazí spinner během asynchronní operace
   * @param {string} message - Zpráva zobrazená se spinnerem
   * @param {Function} asyncFunction - Asynchronní funkce k vykonání
   * @param {string} successMessage - Zpráva při úspěchu
   * @param {string} errorMessage - Zpráva při chybě
   * @returns {Promise<any>} - Výsledek asynchronní funkce
   */
  async withSpinner(message, asyncFunction, successMessage = null, errorMessage = null) {
    const spinner = ora(message).start();
    try {
      const result = await asyncFunction();
      if (successMessage) {
        spinner.succeed(successMessage);
      } else {
        spinner.succeed();
      }
      return result;
    } catch (error) {
      if (errorMessage) {
        spinner.fail(errorMessage);
      } else {
        spinner.fail(`Error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Zobrazí hlavičku sekce
   * @param {string} title - Název sekce
   */
  displayHeader(title) {
    console.log(chalk.cyan(`\n=== ${title} ===`));
  }

  /**
   * Zobrazí informační řádek (klíč: hodnota)
   * @param {string} label - Popisek
   * @param {string} value - Hodnota
   */
  displayInfo(label, value) {
    console.log(`${chalk.white(label)}: ${chalk.yellow(value || 'N/A')}`);
  }

  /**
   * Zobrazí výstražnou zprávu
   * @param {string} message - Zpráva
   */
  displayWarning(message) {
    console.log(chalk.yellow(`⚠️  ${message}`));
  }

  /**
   * Zobrazí chybovou zprávu
   * @param {string} message - Zpráva
   */
  displayError(message) {
    console.log(chalk.red(`❌ ${message}`));
  }

  /**
   * Zobrazí úspěšnou zprávu
   * @param {string} message - Zpráva
   */
  displaySuccess(message) {
    console.log(chalk.green(`✓ ${message}`));
  }

  /**
   * Zobrazí popis s možným ořezáním
   * @param {string} text - Popisný text
   * @param {number} maxLength - Maximální délka před ořezáním
   */
  displayDescription(text, maxLength = 500) {
    if (!text) return;
    
    console.log(chalk.cyan('\nDescription:'));
    console.log(chalk.gray(text.substring(0, maxLength) + 
      (text.length > maxLength ? '...' : '')));
  }

  /**
   * Zobrazí tabulku dat
   * @param {Array<string>} headers - Záhlaví tabulky
   * @param {Array<Array<string>>} rows - Řádky tabulky
   */
  displayTable(headers, rows) {
    // Výpočet šířky sloupců
    const widths = headers.map((header, idx) => {
      let maxWidth = header.length;
      rows.forEach(row => {
        const cellValue = String(row[idx] || '');
        if (cellValue.length > maxWidth) {
          maxWidth = cellValue.length;
        }
      });
      return maxWidth + 2; // Přidání zarovnání
    });
    
    // Tisk záhlaví
    let headerRow = '';
    headers.forEach((header, idx) => {
      headerRow += chalk.cyan(header.padEnd(widths[idx]));
    });
    console.log(headerRow);
    
    // Tisk oddělovače
    const separator = widths.map(width => '-'.repeat(width)).join('');
    console.log(chalk.gray(separator));
    
    // Tisk řádků
    rows.forEach(row => {
      let rowStr = '';
      row.forEach((cell, idx) => {
        rowStr += chalk.white(String(cell || '').padEnd(widths[idx]));
      });
      console.log(rowStr);
    });
  }

  /**
   * Zobrazí odkaz na adresář
   * @param {string} dirPath - Cesta k adresáři
   * @param {string} [label] - Volitelný popisek
   */
  displayDirectoryLink(dirPath, label = null) {
    const dirLink = generateDirectoryLink(dirPath);
    if (label) {
      console.log(chalk.cyan(`\n${label}: `));
    } else {
      console.log(chalk.cyan('\nDirectory: '));
    }
    console.log(chalk.blue.underline(dirLink));
    console.log(chalk.white(dirPath));
  }

  /**
   * Zkopíruje text do schránky a zobrazí zprávu
   * @param {string} text - Text ke zkopírování
   * @param {string} [successMessage] - Zpráva při úspěchu
   */
  copyToClipboard(text, successMessage = 'Copied to clipboard.') {
    try {
      clipboard.copyWithFeedback(text, successMessage);
      return true;
    } catch (error) {
      logger.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  /**
   * Zeptá se uživatele, zda chce zkopírovat text do schránky
   * @param {string} text - Text ke zkopírování
   * @param {string} [message] - Zpráva dotazu
   * @param {string} [successMessage] - Zpráva při úspěchu
   */
  async askToCopyToClipboard(text, message = 'Would you like to copy this to your clipboard?', successMessage = 'Copied to clipboard.') {
    const shouldCopy = await this.confirm(message, true);
    if (shouldCopy) {
      return this.copyToClipboard(text, successMessage);
    }
    return false;
  }

  /**
   * Formátuje velikost souboru na čitelný formát
   * @param {number} bytes - Velikost v bajtech
   * @returns {string} - Formátovaná velikost
   */
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }
}

// Vytvoření singleton instance
const uiHelper = new UIHelper();

module.exports = uiHelper;