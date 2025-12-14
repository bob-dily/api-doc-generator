// App API Hooks

export const useAppController_getHello = () => {
  const apiCall = async () => {
    const path = `${process.env.REACT_APP_API_BASE_URL || ''}/`;
    const url = path;
    const options: RequestInit = {
      method: 'GET',
    };

    const result = await fetch(url, options);
    return result.json() as Promise<any>;
  };

  return { appController_getHello: apiCall };
};

