// Requires async for proper function
try {
chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
  const runeList = getRunes();
  sendResponse({runes:runeList});
});
}
catch (err) {
  console.log('ok ' + err);
}

function getRunes()
{
  // Get a list of each item in the inventory
  let items = document.getElementById('app').querySelectorAll('.item-container');
  let runes = [];
  // Iterate each item to find runes
  items.forEach(item =>
  {
      imgSrc = item.getElementsByTagName('img')[0].src;
      let sep = imgSrc.split('/');
      let rawName = sep[sep.length - 1].split('.')[0];
      let nameSplit = rawName.split('_');
      if (nameSplit[1] === 'rune')
      {
        runes.push(nameSplit[0]);
      }

  });
  return runes.toString();
}