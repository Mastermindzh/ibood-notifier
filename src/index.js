import axios from "axios";
import notifier, {NotificationCenter} from "node-notifier";
import cheerio from "cheerio";
import opn from "opn";
import path from "path"

let currentTitle = "";
var timer = "";

function getImage(imageHTML){
  let dom = cheerio.load(imageHTML)

  return dom('img.fluid').attr('data-mobile').substring(2);
}

function getPriceInfo(priceHTML) {

  let dom = cheerio.load(cleanHTML(priceHTML), { decodeEntities: true })

  return {
    oldPrice: dom('span.strike span').text(),
    newPrice: dom('span.new-price').text(),
    discountPercentage: dom('span.discount').text().split('%')[0]
  }

}

function cleanHTML(html){
  return html.replace('\\n', '').replace('\\', '');
}

function getJson() {
  axios.get('http://feeds.ibood.com/nl/nl/offer.json').then(result => {
    if (isNew(result.data)) {
      currentTitle = result.data.Title;
      notify(result.data)
    }
  });
}

function isNew(json) {
  return json.Title != currentTitle
}

function notify(json) {
  let priceInfo = getPriceInfo(json.Price);

  let notifierToUse = notifier;

  if(process.platform == "darwin"){    
    notifierToUse = new notifier.NotificationCenter();
  }

  notifier.on('click', function(notifierObject, options) {
    opn(json.Permalink);
  });

  notifierToUse.notify({
    title: json.Title,
    open: json.Permalink,
    message: `From ${priceInfo.oldPrice} for ${priceInfo.newPrice} (${priceInfo.discountPercentage}%)`,
    icon: path.join(__dirname, 'images/hunt.png'),
    contentImage: getImage(cleanHTML(json.Image))
  });
}

if (require.main === module) {
  getJson();
  timer = setInterval(getJson, 1000);
}



