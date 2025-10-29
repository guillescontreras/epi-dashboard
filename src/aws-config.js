import { Amplify } from 'aws-amplify';

const config = {
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_zrdfN7OKN',
      userPoolClientId: '1r4a4vec9qbfsk3vmj7em6pigm',
      region: 'us-east-1'
    }
  }
};

Amplify.configure(config);
export default config;