import cheerio from 'cheerio'
import fs from 'fs'
import got from 'got'
import moment from 'moment'
import prompts from 'prompts'

if (process.env.DATE === undefined) {
  console.error('Date required')
  process.exit(1)
}

if (process.env.KEYWORD === undefined) {
  console.error('Keyword required')
  process.exit(1)
}

const keyword = process.env.KEYWORD
const archive = process.env.ARCHIVE || 'web';
let date = moment(process.env.DATE)
let data = {}

const promptContinue = async () => {
  if (date.isSameOrBefore()) {
    execute()
  }

  return

  const response = await prompts({
    type: 'confirm',
    name: 'continue',
    message: 'Continue?'
  });

  if (response['continue']) {
    execute()
  }
}

const save = () => {
  if (Object.entries(data).length === 0) {
    promptContinue()
    return
  }

  let dataToWrite = []

  Object.entries(data).forEach(([key, value]) => value.forEach((eachValue) => {
    dataToWrite.push(`* ${key} ${eachValue.href} ${eachValue.text}`)
  }))

  fs.appendFile(`${keyword}-${archive}.txt`, dataToWrite.join(`\n`) + `\n`, (err) => {
    if (err) throw err;
    console.log(`Saved - ${dataToWrite.length}`);

    data = {}

    promptContinue()
  });
}

const hasKeyword = (i, link) => {
  if (typeof link.attribs.href === 'undefined') {
    return false
  }

  if (link.children.length === 0) {
    return false
  }

  return link.firstChild.nodeValue.toLowerCase().includes(keyword);
};

function execute() {
  const url = `https://www.thehindu.com/archive/${archive}/${date.format('YYYY')}/${date.format('MM')}/${date.format('DD')}/`;

  got(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
    }
  }).then(response => {
    const links = cheerio.load(response.body)('.archive-list a')
    const thisDate = date.format('YYYY-MM-DD')
    date = date.add(1, 'days')

    if (links.length === 0) {
      console.log(thisDate, 'No links found')
      save()
      return
    }

    console.log(thisDate, links.length, links.filter(hasKeyword).length)

    links.filter(hasKeyword).each((i, link) => {
      data[thisDate] = data[thisDate] || []

      data[thisDate].push({
        href: link.attribs.href,
        text: link.firstChild.nodeValue,
      })

      console.log(`${thisDate} -- ${link.firstChild.nodeValue} -- ${link.attribs.href}`)
    })

    execute()
  }).catch(err => {
    console.log(err);

    save()
  });
}

execute()
