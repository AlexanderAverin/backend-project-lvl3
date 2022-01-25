import axios from 'axios';

const load = (url) => {
  const response = axios.get(url).catch((err) => {
    if (err) {
      throw err;
    }
  });
  return response;
};

export default load;
