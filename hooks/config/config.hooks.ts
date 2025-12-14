// Config API Hooks

export interface ConfigController_getConfigParams {
  userId?: number;
}

export interface ConfigController_updateConfigParams {
  userId: number;
}

export const useConfigController_getConfig = () => {
  const apiCall = async (params: ConfigController_getConfigParams) => {
    const path = `${process.env.REACT_APP_API_BASE_URL || ''}/api/config`;
    const queryParams = new URLSearchParams();
    if (params.userId) queryParams.append('userId', params.userId.toString());
    const queryString = queryParams.toString();
    const url = `${path}${queryString ? '?' + queryString : ''}`;
    const options: RequestInit = {
      method: 'GET',
    };

    const result = await fetch(url, options);
    return result.json() as Promise<UserConfig[]>;
  };

  return { configController_getConfig: apiCall };
};

export const useConfigController_updateConfig = () => {
  const apiCall = async (params: ConfigController_updateConfigParams) => {
    const path = `${process.env.REACT_APP_API_BASE_URL || ''}/api/config/${params.userId}`;
    const url = path;
    const options: RequestInit = {
      method: 'PUT',
    };

    const result = await fetch(url, options);
    return result.json() as Promise<UserConfig>;
  };

  return { configController_updateConfig: apiCall };
};

