/**
 * Parses a PES-style player description text into a structured object.
 * - Skills and COM Styles become objects with boolean values.
 * - Positions become an object with values A (starred) or B (non-starred).
 * @param {string} text - Raw clipboard text with player data.
 * @returns {object} Parsed player object.
 */
function parsePlayerText(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const player = {
    basic: {},
    appearance: {},
    stats: {},
    skills: {},
    comPlayingStyles: {},
    positions: {},
    playingStyle: ""
  };

  let section = "basic"; // default section

  for (const line of lines) {
    if (/^APPEARANCE:/i.test(line)) {
      section = "appearance";
      continue;
    }
    if (/^STATS:/i.test(line)) {
      section = "stats";
      continue;
    }
    if (/^CARD PLAYER SKILL:/i.test(line)) {
      section = "skills";
      continue;
    }
    if (/^CARD STYLE COM:/i.test(line)) {
      section = "comPlayingStyles";
      continue;
    }
    if (/^PLAYING STYLE:/i.test(line)) {
      section = "playingStyle";
      continue;
    }

    // ----- BASIC -----
    if (section === "basic") {
      const [key, val] = line.split(":").map(s => s.trim());
      if (!key || val === undefined) continue;

      if (key === "Positions") {
        // parse positions like *RWF,CF,AMF
        val.split(",").forEach(pos => {
          pos = pos.trim();
          if (!pos) return;
          if (pos.startsWith("*")) {
            player.positions[pos.substring(1)] = "A";
          } else {
            player.positions[pos] = "B";
          }
        });
      } else {
        player.basic[key] = val;
      }
    }

    // ----- APPEARANCE -----
    else if (section === "appearance") {
      const [key, val] = line.split(":").map(s => s.trim());
      if (key && val !== undefined) player.appearance[key] = val;
    }

    // ----- STATS -----
    else if (section === "stats") {
      const [key, val] = line.split(":").map(s => s.trim());
      if (key && val !== undefined) player.stats[key] = isNaN(val) ? val : Number(val);
    }

    // ----- SKILLS -----
    else if (section === "skills") {
      if (line.startsWith("*")) {
        const skill = line.replace("*", "").trim();
        player.skills[skill] = true;
      }
    }

    // ----- COM STYLES -----
    else if (section === "comPlayingStyles") {
      if (line.startsWith("*")) {
        const com = line.replace("*", "").trim();
        player.comPlayingStyles[com] = true;
      }
    }

    // ----- PLAYING STYLE -----
    else if (section === "playingStyle") {
      if (line) player.playingStyle = line;
    }
  }

  return player;
}

/**
 * Waits for a specified amount of time.
 * @param {number} ms - Milliseconds to wait.
 * @returns {Promise<void>}
 */
function wait(ms){ return new Promise(r => setTimeout(r, ms)); }

/**
 * Extracts text from a DOM element.
 * @param {Element} el - Element to inspect.
 * @param {boolean} includeChildren - If true, considers child element text too.
 * @returns {string} First non-empty text found.
 */
function getText(el, includeChildren = false) {
  for (const n of el.childNodes) {
    if (n.nodeType === Node.TEXT_NODE) {
      const t = n.textContent.trim();
      if (t) return t;
    }
    if (includeChildren && n.nodeType === Node.ELEMENT_NODE) {
      const t = (n.textContent || "").trim();
      if (t) return t;
    }
  }
  return "";
}

/**
 * Finds a element whose first text content matches the provided string.
 * @param {Element} root - Root container to search within.
 * @param {string} text - Exact text to match.
 * @returns {Element|null} Element or null if not found.
 */
function getElementByText(root, text) {
  // so far the web followed this format labels and divs
  const matches = root.querySelectorAll("label, div");
  for (const el of matches) {
    if (getText(el, true) === text) {
      return el;
    }
  }
  return null;
}

/**
 * Sets the value of an input or textarea in a React-friendly way.
 * @param {HTMLInputElement|HTMLTextAreaElement} input - Input element.
 * @param {string|number} value - Value to set.
 */
function setReactValue(input, value) {
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, "value");
  const setter = desc && desc.set;
  if (setter) setter.call(input, String(value));
  else input.value = String(value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Sets the checked state of a checkbox in a React-friendly way.
 * @param {HTMLInputElement} input - Checkbox input element.
 * @param {boolean} checked - Desired checked state.
 */
function setReactChecked(input, checked) {
  const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked");
  if (desc && desc.set) desc.set.call(input, !!checked);
  else input.checked = !!checked;
  input.dispatchEvent(new Event("input",  { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Marks a radio input as selected in a React-friendly way.
 * @param {HTMLInputElement} radio - Radio input element.
 */
function setReactSelect(radio) {
  const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked");
  if (desc && desc.set) desc.set.call(radio, true);
  else radio.checked = true;

  radio.dispatchEvent(new Event("input",  { bubbles: true }));
  radio.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Sets the value of an input field based on its element text.
 * @param {Element} root - Root container to search within.
 * @param {string} elText - Exact text of the element.
 * @param {string|number} value - Value to set.
 * @returns {boolean} True if the input was found and set, otherwise false.
 */
function setInputByElementText(root, elText, value) {
  if (value==null) return false;

  const el = getElementByText(root, elText);
  if (!el) return false;

  const input = el.querySelector("input");
  if (!input) return false;

  setReactValue(input, value);
  return true;
}

/**
 * Sets the state of a checkbox based on its element text.
 * @param {Element} root - Root container to search within.
 * @param {string} elText - Exact text of the element.
 * @param {boolean} value - Boolean value to set.
 * @returns {boolean} True if checkbox was found and set, otherwise false.
 */
function setCheckboxByElementText(root, elText, value) {
  if (value==null) return false;

  const el = getElementByText(root, elText);
  if (!el) return false;

  const checkbox = el.querySelector("input[type='checkbox']");
  if (!checkbox) return false;

  setReactChecked(checkbox, value);
  return true;
}

/**
 * Selects a radio button option by its element and value.
 * @param {Element} root - Root container to search within.
 * @param {string} elText - element text that identifies the field.
 * @param {string} value - Desired radio value (e.g., "A", "B", "C").
 * @returns {Promise<boolean>} True if radio was found and set, otherwise false.
 */
async function setSelectByElementText(root, elText, value) {
  const el = getElementByText(root, elText);
  if (!el) return false;

  const radio = el.querySelector(`input[type="radio"][value="${value}"]`);
  if (!radio) return false;

  try { radio.click(); } catch(_) {}
  await Promise.resolve();

  if (radio.checked) return true;

  setReactSelect(radio);
  await Promise.resolve();

  return true;
}

/**
 * Opens and selects an option from a dropdown by element text.
 * @param {Element} root - Root container to search within.
 * @param {string} elText - Element text identifying the field.
 * @param {string} option - Option name/text to select.
 * @param {string} fallbackOption - Fallback option name/text to select.
 * @param {boolean} anyText - Flag in case we need to search for any text inside the button.
 * @returns {Promise<boolean>} True if option was selected, otherwise false.
 */
async function setComboboxByElementText(root, elText, option, fallbackOption, anyText = false) {
  let trigger = null;
  const el = getElementByText(root, elText);
  if (!el) return false;

  trigger = el.querySelector("button");
  if (!trigger) return false;

  trigger.click();
  await wait(60);

  const opt = Array.from(el.querySelectorAll("button"))
    .find(b => getText(b, anyText) === option);
  // useful condition to prevent recursion loop
  if (!opt && option === fallbackOption){
    return false;
  }
  else if (!opt) {
    // fallback in case the option wasn't found
    console.warn("The option:", option, "wasn't found, trying to use fallback option:", fallbackOption);
    trigger.click();
    await wait(60);
    return await setComboboxByElementText(root, elText, fallbackOption, fallbackOption, anyText);
  }

  opt.click();
  return true;
}

/**
 * Returns a content div based on its preceding title div text.
 * @param {string} title - Title text to search for.
 * @returns {Element|null} Content div or null if not found.
 */
function getContentByDivTitle(title) {
  const allDivs = Array.from(document.querySelectorAll("div"));
  const titleDiv = allDivs.find(d => (d.textContent || "").trim() === title);
  if (!titleDiv) return null;
  const contentDiv = titleDiv.nextElementSibling;
  console.log(title);
  console.log(contentDiv);
  if (contentDiv && contentDiv.querySelector("input")) return contentDiv;
  return null;
}

/**
 * Set all checkboxes inside the element to a specific value.
 * @param {Element} root - Container with checkboxes.
 * @param {boolean} value - Value to apply to all checkboxes.
 */
function setAllCheckboxesToValue(root, value) {
  if (!root) return;

  const allCheckboxes = root.querySelectorAll('input[type="checkbox"]');
  allCheckboxes.forEach(cb => setReactChecked(cb, value));
}

/**
 * Set all radio inputs inside the element to a specific value.
 * @param {Element} root - Container with radio inputs.
 * @param {string} value - Radio value to select (e.g., "A", "B", "C").
 */
async function setAllRadiosToValue(root, value) {
  if (!root) return;

  const radios = root.querySelectorAll('input[type="radio"]');
  for (const radio of radios) {
    if (radio.value === value) {

      try { radio.click(); } catch(_) {}
      await Promise.resolve();

      if (radio.checked) continue;

      setReactSelect(radio);
      await Promise.resolve();
    }
  };
}


/**
 * Fills the COM Playing Styles section with provided values.
 * @param {object} comPlayingStyles - Object mapping style names to booleans.
 */
function fillCOMPlayingstyles(comPlayingStyles) {
  const root = getContentByDivTitle("COM Playing Styles");
  if (!root) {
    console.log("COM Playing Styles section not found.");
    return;
  }

  setAllCheckboxesToValue(root, false);
  
  for (const k in comPlayingStyles) {
    if (!setCheckboxByElementText(root, k, comPlayingStyles[k])) {
      console.log("error trying to set skill:", k, "to value:", comPlayingStyles[k]);
    }
  }
}

/**
 * Fills the Player Skills section with provided values.
 * @param {object} playerSkills - Object mapping skill names to booleans.
 */
function fillPlayerSkills(playerSkills) {
  const root = getContentByDivTitle("Player Skills");
  if (!root) {
    console.log("Player Skills section not found.");
    return;
  }

  setAllCheckboxesToValue(root, false);
  
  for (const k in playerSkills) {
    if (!setCheckboxByElementText(root, k, playerSkills[k])) {
      console.log("error trying to set skill:", k, "to value:", playerSkills[k]);
    }
  }
}

/**
 * Fills the Ability section with stat values.
 * @param {object} stats - Object mapping ability names to numbers.
 */
function fillAbility(stats) {
  const root = getContentByDivTitle("Ability");
  if (!root) {
    console.log("Ability section not found.");
    return;
  }
  for (const k in stats) {
    if (!setInputByElementText(root, k, stats[k])) {
      console.log("error trying to set ability:", k, "to value:", stats[k])
    };
  }
}

/**
 * Fills the Info section (basic details, appearance, nationality).
 * @param {object} player - Player object parsed from text.
 */
async function fillInfo(player) {
  const root = getContentByDivTitle("Info");
  if (!root) {
    console.log("Info column root not found.");
    return;
  }

  // basic
  if (!setInputByElementText(root, "Player Name", player.basic["Name"])) {
    console.log("error trying to set Player Name to: ", player.basic["Name"]);
  }
  
  if (!setInputByElementText(root, "Shirt name (club)", player.basic["Shirt Name"])) {
    console.log("error trying to set Shirt name (club) to: ", player.basic["Shirt Name"]);
  }

  if (!setInputByElementText(root, "Shirt name (national team)", player.basic["Shirt Name"])) {
    console.log("error trying to set Shirt name (national team) to: ", player.basic["Shirt Name"]);
  }

  if (!setInputByElementText(root, "Age", player.basic["Age"])) {
    console.log("error trying to set Age to: ", player.basic["Age"]);
  }

  if (!await setSelectByElementText(root, "Stronger Foot", player.basic["Foot"])){
    console.log("error trying to set Stronger Foot to: ", player.basic["Foot"]);
  }

  if (!setInputByElementText(root, "Reputation", player.basic["Reputation"])) {
    console.log("error trying to set Reputation to: ", player.basic["Reputation"]);
  }

  if (!await setComboboxByElementText(root, "Country/Region", player.basic["Nationality"], "- Others")) {
    console.log("error trying to set Country/Region to: ", player.basic["Nationality"]);
  }

  // appearance
  if (!setInputByElementText(root, "Height (cm)", parseInt(player.appearance["Height"]))) {
    console.log("error trying to set Height (cm) to: ", player.appearance["Height"]);
  }
  if (!setInputByElementText(root, "Weight (kg)",  parseInt(player.appearance["Weight"]))) {
    console.log("error trying to set Weight (kg) to: ", player.appearance["Weight"]);
  }

  // playing style
  if (!await setComboboxByElementText(root, "Playing Style", player.playingStyle, "N/A", true)) {
    console.log("error trying to set Playing Style to: ", player.playingStyle);
  }

}

/**
 * Fills the Overall & Position section with registered position and ratings.
 * @param {object} player - Player object parsed from text.
 */
async function fillPosition(player) {
  const root = getContentByDivTitle("Overall & Position");
  if (!root) {
    console.log("Overall & Position column root not found.");
    return;
  }

  if (!setInputByElementText(root, "Registered Position", player.basic["Registered Position"])) {
    console.log("Error trying to set Registered Position to:", player.basic["Registered Position"]);
  }

  // first we set all positions to C
  await setAllRadiosToValue(root, "C");

  // now we set all the positions correct values
  if (! await setSelectByElementText(root, player.basic["Registered Position"], "A")){
    console.log("Error trying to set Position", player.basic["Registered Position"], "to: A");
  }

  for (const k in player.positions) {
    if (!await setSelectByElementText(root, k, player.positions[k])){
      console.log("Error trying to set Position", k, "to:", player.positions[k]);
    }
  }

}

/**
 * Reads player data from the clipboard and fills all sections accordingly.
 */
async function setPlayerData() {
  let text;
  try {
    text = await navigator.clipboard.readText();
  } catch (error) {
    console.error(error);
    alert("PES Paste Stats Error: unabled to read clipboard");
    return;
  }

  console.log("Receive from clipboard:", text);

  const player = parsePlayerText(text);
  await fillInfo(player);
  await fillPosition(player);
  fillAbility(player.stats);
  fillPlayerSkills(player.skills);
  fillCOMPlayingstyles(player.comPlayingStyles);
}

/**
 * Creates and shows the floating "Paste Stats" button.
 */
function showButton() {
  if (document.getElementById("paste-stats-btn")) return;
  const btn = document.createElement("button");
  btn.id = "paste-stats-btn";
  btn.textContent = "Paste Stats";
  btn.style.position = "fixed";
  btn.style.bottom = "20px";
  btn.style.right = "20px";
  btn.style.zIndex = 999999;
  btn.style.padding = "8px 12px";
  btn.style.background = "#111";
  btn.style.color = "#fff";
  btn.style.border = "none";
  btn.style.borderRadius = "6px";
  btn.style.cursor = "pointer";
  btn.onclick = setPlayerData;
  document.body.appendChild(btn);
}

/**
 * Removes the floating "Paste Stats" button if present.
 */
function hideButton() {
  const btn = document.getElementById("paste-stats-btn");
  if (btn) btn.remove();
}

/**
 * Checks if the "Players" tab is active and toggles the button accordingly.
 */
function checkPlayersTab() {
  const tabs = Array.from(document.querySelectorAll("button"));
  const playersTab = tabs.find(b => (b.textContent || "").trim() === "Players");
  if (playersTab && playersTab.className.includes("_active_")) {
    showButton();
  } else {
    hideButton();
  }
}

/**
 * Main logic with the observer checking if we're at the players tab
 */
const observer = new MutationObserver(() => checkPlayersTab());
observer.observe(document.body, { subtree: true, attributes: true, childList: true });

checkPlayersTab();


