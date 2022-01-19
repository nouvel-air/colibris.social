const PNF = require('google-libphonenumber').PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

const formatPhoneNumber = (number, countryCode) => {
  if( number && countryCode ) {
    try {
      const parsedNumber = phoneUtil.parseAndKeepRawInput(number, countryCode);
      return phoneUtil.format(parsedNumber, PNF.INTERNATIONAL);
    } catch(e) {
      // In case of error, return the raw phone number
      return number;
    }
  }
};

const frenchAddressSearch = async query => {
  const url = new URL('https://api-adresse.data.gouv.fr/search/');
  url.searchParams.set('q', query)
  const response = await fetch(url.toString());

  if( response.ok ) {
    const json = await response.json();
    return json.features[0];
  } else {
    return false;
  }
};

module.exports = {
  formatPhoneNumber,
  frenchAddressSearch
}