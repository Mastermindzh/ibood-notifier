import axios from "axios";
import notifier, {
  NotificationCenter
} from "node-notifier";
import cheerio from "cheerio";
import opn from "opn";
import path from "path"
import scrape from "website-scraper";
import util from "util";
import rimraf from "rimraf";

const rmrf = util.promisify(rimraf);
const protocol = "http://"
const googleDivClass = "A8OWCb";

let currentTitle = "";

/**
 * Check shopping.google.com for the current price estimate
 * @param {*} title search param 
 */
function getGooglePrice(title) {

  return new Promise((resolve, reject) => {
    let escapedTitle = title.split(' ').join('%20');

    let url = `https://www.google.com/search?hl=nl-NL&tbm=shop&ei=evp6W73BD462kwWZrJLgBQ&q=${escapedTitle}&oq=${escapedTitle}&gs_l=psy-ab.3...9257.11314.0.11503.8.8.0.0.0.0.87.368.6.6.0....0...1c.1.64.psy-ab..2.1.85...0.0.r5Mm2pYV_QE`

    rmrf('./scraper').then(result => {
      scrape({
        urls: [url],
        directory: './scraper',
      }).then(result => {

        let $ = cheerio.load(result[0].text);

        // find first price tag and read the html
        $ = cheerio.load($(`.${googleDivClass}`).first().html());

        // find price
        resolve($("b").first().text());

      }).catch(reject);
    }).catch(reject);
  })

}

/**
 * Finds the content image
 * @param {*} imageHTML 
 */
function getImage(imageHTML) {
  let dom = cheerio.load(imageHTML)

  return dom('img.fluid').attr('data-mobile').substring(2);
}

/**
 * get the price info from the html and return it as json
 * @param {json} priceHTML 
 * @returns
 * {
 *  oldPrice: "",
 *  newPrice: "",
 *  discountPercentage: "";
 * }
 */
function getPriceInfo(priceHTML) {

  let dom = cheerio.load(cleanHTML(priceHTML), {
    decodeEntities: true
  })

  return {
    oldPrice: dom('span.strike span').text(),
    newPrice: dom('span.new-price').text(),
    discountPercentage: dom('span.discount').text().split('%')[0]
  }

}

/**
 * clean the ibood html
 * @param {*} html 
 */
function cleanHTML(html) {
  return html.replace('\\n', '').replace('\\', '');
}

/**
 * get the current offer json from ibood
 */
function getJson() {
  axios.get(`${protocol}feeds.ibood.com/nl/nl/offer.json`).then(result => {
    if (isNew(result.data)) {
      currentTitle = result.data.Title;

      // try and get the google price
      getGooglePrice(encodeURIComponent(result.data.Title)).then(price => {
        result.data.google = price;

        notify(result.data);
      }).catch(err => {

        result.data.google = "n/a";
        notify(result.data);
      });
    }
  });
}

/**
 * check whether result is new
 * @param {*} json json to check
 */
function isNew(json) {
  return json.Title != currentTitle
}

/**
 * send out the notification
 * @param {*} json json to notify
 */
function notify(json) {
  let priceInfo = getPriceInfo(json.Price);

  let notifierToUse = notifier;

  // think different...
  if (process.platform == "darwin") {
    notifierToUse = new notifier.NotificationCenter();
  }

  // set a onclick handler
  notifier.on('click', function (notifierObject, options) {
    opn(json.Permalink);
  });

  let notification = {
    title: json.ShortTitle,
    open: json.Permalink,
    message: `From ${priceInfo.oldPrice} for ${priceInfo.newPrice} (${priceInfo.discountPercentage}%) \r\n Google estimated price: ${json.google}`,
    icon: path.join(__dirname, 'images/hunt.png'),
    contentImage: `${protocol}${getImage(cleanHTML(json.Image))}`
  };

  // send notification and log it to the console
  notifierToUse.notify(notification);
  console.log(notification);
}


/// run module
if (require.main === module) {
  getJson();
  setInterval(getJson, 1000);
}