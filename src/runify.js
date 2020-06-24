const RUNES = ['el', 'eld', 'tir', 'nef', 'eth', 'ith', 'tal', 'ral', 'ort', 'thul', 'amn', 'sol', 'shael',
               'dol', 'hel', 'io', 'lum', 'ko', 'fal', 'lem', 'pul', 'um', 'mal', 'ist', 'gul', 'vex', 'ohm',
               'lo', 'sur', 'ber', 'jah', 'cham', 'zod'];
const DEFAULT_SETTINGS = {
               'prices': ['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0',
                          '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0'],
             'upgrades': [true, true, true, true, true, true, true, true, true,
                          true, true, true, true, true, true, true, true, false,
                          false, false, false, false, false, false, false, false, 
                          false, false, false, false, false, false, false],
        'hide-hr-value': 'false',
     'hide-upgrade-log': 'false',
   'only-show-equipped': 'true',
  'value-with-quantity': 'false'
  };
const SORT = {
  ASCENDING: 0,
  DESCENDING: 1
};
$(document).ready(() => {
  // Setup settings and prices objects
  let settings = {};
  let prices = [];
  let upgrades = [];

  // Setup settings
  loadSettingsFromStorage();

  // Holder for runes found in inventory
  let RunesInInventory = [];

  // Preload button_down image to avoid flicker on click
  const downSrc = '/images/button_down.png';
  const tmpImg = $('<img/>').attr('src', downSrc);


  // ===[ Button animation ]===
  let mouseDown = false;

  // Moves button text back if mouse down while leaving button area
  $(document.body).on('mouseleave', '.btn', (e) => {
    if (mouseDown) {
      $(e.currentTarget).css({backgroundImage: "url('/images/button_up.png')"});
      mouseDown = false;
      animateButton(mouseDown, e);
    }
  });

  $(document.body).on('mousedown', '.btn', (e) => {
    mouseDown = true;
    animateButton(mouseDown, e);
  });
  
  $(document.body).on('mouseup', '.btn', (e) => {
    mouseDown = false;
    animateButton(mouseDown, e);
  });

  // Display main page first
  loadMainPage();

  // Load main page into container
  function loadMainPage() {
    $('#main-container').load('./runify.html').ready(() => {
      chrome.tabs.query({currentWindow: true, active: true},
        (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, 'getRunes', sniffRunesFromInventory);
        }); 
    });
  }

  // Sets up the settings and prices objects with data from localStorage
  function loadSettingsFromStorage() {
    // Set default localStorage if first time load
    if (Object.keys(localStorage).length != Object.keys(DEFAULT_SETTINGS).length) {
      deepCopy(DEFAULT_SETTINGS, localStorage);
    }
    deepCopy(localStorage, settings);
    prices = settings['prices'].split(',');
    upgrades = settings['upgrades'].split(',').map((v) => v === 'true' ? true : false);
  }


  /*
    ===[  Buttons and button handlers ]===
  */
   // Handles movement of the button text on mouseDown/Up
   function animateButton(isPressed, e) {
    let backward = '-=2px';
    let forward = '+=2px';
    let btnText = $(e.currentTarget).children();
    let btnStyle = { 
      marginLeft: isPressed ? backward : forward,
       marginTop: isPressed ? forward  : backward
    };
    $(btnText).css(btnStyle);
  }

  // UPGRADE RUNES button
  let refreshRunesButton = true;
  $(document.body).on('click', '#upgrade-runes', () => { 
    if (RunesInInventory.length > 0) {
      if (refreshRunesButton) {
        $('#upgrade-runes .btn-text').text('RELOAD RUNES');
        buildRuneInventoryTable($('#rune-table'), upgradeRunes(RunesInInventory));
        refreshRunesButton = false;
      }
      else {
        // Reload main page to refresh rune list
        refreshRunesButton = true;
        loadMainPage();
      }
    }
  });
  
  // SETTINGS button
  $(document.body).on('click', '#open-settings', () => { loadSettingsPage(); });

  // Load settings.html into container
  function loadSettingsPage() {
    refreshRunesButton = true;  // Reset toggle when main page eventually reloads
    $('#main-container').load('./settings.html', () => {
      buildRuneSettingsTable();
      markCheckboxes();
    });
  }

  // Marks checkboxes according to settings
  function markCheckboxes() {
    let check = (id) => {
      if (settings[id] == 'true') {
        $('#' + id).prop('checked', true);
      }
    }
    check('hide-hr-value');
    check('hide-upgrade-log');
    check('value-with-quantity');
    check('only-show-equipped');
  }

  // Builds the rune table for the settings page
  function buildRuneSettingsTable() {
    let container = $('#rune-table');
    let thead = $('<thead/>');
    let hrow = $('<tr/>');
    let headers = ['#', 'RUNE', 'VALUE', 'UPGRADE?'];
    headers.forEach((text) => { hrow.append(`<td>${text}</td>`); });
    container.append(thead.append(hrow));
    let tbody = $('<tbody/>');
    let ascendingRunes = RUNES.slice(0).reverse();
    ascendingRunes.forEach((rune) => {
      let imageSrc = `images/runes/${rune}.gif`;
      let row = $('<tr/>');
      row.append(`<td class="rank">${getRuneId(rune)}</td>`);
      row.append(`<td><img src="${imageSrc}">${rune.toUpperCase()}</td>`);
      row.append(`<td><input type="text" class="hr-value" data-rune="${rune}" value="${getPrice(rune)}"></td>`);
      row.append(`<td class="upgrade-box">${(rune != 'zod' ? `<input type="checkbox" class="upgrade-check" data-rune="${rune}" ${(isUpgradeable(rune) ? 'checked' : '')}>` : '')}</td>`);
      tbody.append(row);
    });
    container.append(tbody);
  }

  // ===[ Settings events ]===
  // Auto-save edits as they're made
  $(document.body).on('change', (e) => {
    let className = e.target.className;
    let runeName = e.target.dataset.rune;
    if (className && runeName) {
      if (className == 'hr-value') {
        prices[getRuneId(runeName) - 1] = e.target.value;
        settings['prices'] = prices;
        localStorage['prices'] = prices.toString();
      }
      if (className == 'upgrade-check') {
        saveUpgradesToStorage(runeName, e.target.checked);
      }
    }
    else {
      // Determine if state change was one of the checkbox settings
      let idName = e.target.id;
      let settingIds = ['hide-hr-value', 'hide-upgrade-log', 'value-with-quantity', 'only-show-equipped'];
      settingIds.forEach((checkbox) => {
        if (idName == checkbox) {
          settings[checkbox] = localStorage[checkbox] = $(`#${checkbox}`).prop('checked').toString();
        }
      });
    }
  });

  function saveUpgradesToStorage(runeName, state) {
    upgrades[getRuneId(runeName) - 1] = state;
    localStorage['upgrades'] = upgrades.toString();
  }

  // SAVE SETTINGS button
  $(document.body).on('click', '#save-settings', () => { saveSettings(); });

  function saveSettings() {
    let tmpPrices = [];
    let tmpUpgrades = [];
    RUNES.forEach((rune) => {
      let input = $(`input[type="text"][data-rune="${rune}"]`);
      let value = (isNaN(input.val()) ? 0 : input.val());
      tmpPrices.push(value);
      let upgradeable = $(`input[type="checkbox"][data-rune="${rune}"]`).prop("checked");
      if (rune != 'zod') {
        tmpUpgrades.push(upgradeable);
      }
    });
    if (tmpPrices.length > 0 && tmpUpgrades.length > 0) {
      settings['prices'] = prices = tmpPrices;
      upgrades = tmpUpgrades;
      settings['upgrades'] = tmpUpgrades.toString().split(',');
    }
    settings['hide-hr-value'] = $('#hide-hr-value').prop('checked').toString();
    settings['hide-upgrade-log'] = $('#hide-upgrade-log').prop('checked').toString();
    settings['value-with-quantity'] = $('#value-with-quantity').prop('checked').toString();
    settings['only-show-equipped'] = $('#only-show-equipped').prop('checked').toString();

    deepCopy(settings, localStorage);
  };

  $(document.body).on('click', '#go-back', () => {
    loadMainPage();
  });

  // RESET SETTINGS button
  $(document.body).on('click', '#reset-settings', () => { resetSettings(); });

  function resetSettings() {
    localStorage.clear();
    loadSettingsFromStorage();
    loadSettingsPage();
  }

  /*
    ===[ Rune functions ]===
  */
  // Extracts runes from currently selected character's inventory
  function sniffRunesFromInventory(runesFound) {
    if (!runesFound || (runesFound.hasOwnProperty('runes') && !runesFound.runes)) {
      $('#no-runes-found').show();
      return;
    }
    let runes = runesFound.runes.toString().split(',');
    runes = runes.map(rune => getRuneId(rune));
    runes.sort((a, b) => a - b);
    RunesInInventory = Array.from(runes);
    $('#hr-upgrade-log').text(`${RunesInInventory.length} runes found`);
    const countedRunes = getCounts(runes);
    if (settings['hide-hr-value'] === 'true') {
      $('#hr-data').hide();
      $('#rune-container').css({height: '+=30px'});
    }
    else {
      $('#hr-value').val(getTotalValue(countedRunes));
    }
    if (settings['hide-upgrade-log'] === 'true') {
      $('#hr-upgrade-log').hide();
      $('#rune-container').css({height: '+=114px'});
    }
    buildRuneInventoryTable($('#rune-table'), countedRunes);
  }

  // Sums up the value of the runes in the inventory and sets
  // the necessary text boxes with the data
  function getTotalValue(countedRunes) {
    let hrval = 0;
    Object.keys(countedRunes).forEach((rune) => {
       hrval += (prices[RUNES.indexOf(rune)] * countedRunes[rune])
      });
    return hrval;
  }

  // Fills the table with rune info in tabular form
  function buildRuneInventoryTable(table, countedRunes, sortOption=SORT.DESCENDING) {
    table.text('');
    let thead = $('<thead/>');
    let hrow = $('<tr/>');
    let header = ['#', 'RUNE', 'VALUE', 'QUANTITY'];
    $.each(header, (i, value) => { 
      hrow.append(`<td>${value}</td>`);
    });
    table.append(thead.append(hrow));
    let tbody = $('<tbody/>');
    let runes = RUNES.slice(0).reverse();
    if (settings['only-show-equipped'] == 'true') {
      runes = Object.keys(countedRunes);
    }
    runes.sort((a, b) => (sortOption == SORT.ASCENDING ? getRuneId(a) - getRuneId(b) : getRuneId(b) - getRuneId(a)));
    runes.forEach((rune) => {
      let row = buildRuneTableRow(rune, countedRunes[rune]);
      tbody.append(row);
    });
    table.append(tbody);
  }

  // 
  function buildRuneTableRow(rune, runeQuantity) {
    let runeImageSrc = `images/runes/${rune}.gif`;
    let runeValue = getPrice(rune);
    if (!runeQuantity) {
      runeQuantity = '-';
    }
    else if (settings['value-with-quantity'] == 'true' && runeQuantity > 1 && runeValue > 0) {
      runeValue *= runeQuantity;
      runeValue = Math.round(1000 * runeValue) / 1000 + '*';
    }
    if (runeValue == 0) {
      runeValue = '-';
    }

    let row = $(`<tr ${runeQuantity == '-' ? 'class="not-found"' : ''}/>`);
    row.append(`<td class="rank">${getRuneId(rune)}</td>`);
    row.append(`<td><img src="${runeImageSrc}">${rune.toUpperCase()}</td>`);
    row.append(`<td>${runeValue}</td>`);
    row.append(`<td>${runeQuantity}</td>`);
    return row;
  }

  // Returns upgraded rune list
  function upgradeRunes(runeList) {
    let countedRunes = getCounts(runeList, SORT.ASCENDING);
    let logSpans = [];
    $('#hr-upgrade-log').text('');
    Object.keys(countedRunes).forEach((rune) => {
      let nextRune = rune != 'zod' ? getRuneName(getRuneId(rune) + 1) : -1;
      let count = countedRunes[rune];
      let upReq = getUpgradeReq(rune);
      if (count >= upReq && upgrades[getRuneId(rune) - 1]) {
        let uppedCount = Math.floor(count / upReq);
        let remaining = count % upReq;
        countedRunes[rune] = remaining;
        countedRunes[nextRune] = countedRunes[nextRune] ? countedRunes[nextRune] + uppedCount : uppedCount;
        let initialValue = count * getPrice(rune) + remaining * getPrice(rune);
        let upgradedValue = Math.round(1000 * (uppedCount * getPrice(nextRune) - initialValue)) / 1000;
        upgradedValue = upgradedValue > initialValue ? '+' + upgradedValue : upgradedValue;
        if (settings['hide-upgrade-log'] === 'false') {
          let text = `Upgraded ${count - remaining} ${rune} runes into ${uppedCount} ${nextRune} rune${uppedCount > 1 ? 's' : ''}`;
          logSpans.push(buildUpgradeLogSpan(text, upgradedValue));
        }
      }
    });
    logSpans.reverse();
    $('#hr-value').val(getTotalValue(countedRunes));
    $('#hr-upgrade-log').append(logSpans);

    return countedRunes;
  }

  function buildUpgradeLogSpan(text, valueDifference) {
    let span = $('<span>');
    span.addClass('hr-log');
    span.text(text);
    if (valueDifference != 0) {
      let spanVal = $('<span>');
      let valText = ` (${valueDifference})`;
      spanVal.addClass('hr-log');
      spanVal.addClass(valueDifference > 0 ? 'value-up' : 'value-down');
      spanVal.text(valText);
      span.append(spanVal);
    }
    span.append($('<br>'));
    return span;
  }

  // Returns object of the runes and their quantity
  function getCounts(runes, sortOption=SORT.DESCENDING) {
    //  input:   [ 1, 1, 2, 3, 4, 4, 6 ]
    // output:   { el: 2, eld: 1, tir: 1, nef: 2, ith: 1 }
    let counts = {};
    runes.sort((a, b) => sortOption == SORT.ASCENDING ? a - b : b - a);
    runes.forEach(x => counts[getRuneName(x)] = (counts[getRuneName(x)] || 0) + 1);
    return counts;
  }

  // Returns 3 if the rune is pul or less, 2 if higher
  function getUpgradeReq(rune) {
    if (typeof rune === 'string') {
      rune = getRuneId(rune);
    }
    return rune < 21 ? 3 : 2;
  }

  // Checks settings for rune's upgrade status
  function isUpgradeable(rune) {
    if (rune != 'zod' && upgrades[getRuneId(rune) - 1]) {
      return true;
    }
    return false;
  }

  // Checks global price array for given rune price
  function getPrice(rune) {
    let id = getRuneId(rune);
    return parseFloat(prices[id - 1]);
  }

  function getRuneId(rune) {
    if (typeof rune === 'string') {
      return RUNES.indexOf(rune) + 1;  
    }
    return 0;
  }

  function getRuneName(id) {
    if (typeof id === 'number') {
      return RUNES[id - 1]; 
    }
    return '';
  }

  // Helper function to make deep copies of objects
  function deepCopy(a, b) {
    if (typeof a == 'object' && typeof b == 'object') {
      Object.keys(a).forEach((k) => {
        b[k] = a[k];
      });
    }
  }

});
