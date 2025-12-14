// Users API Hooks

export interface UserController_queryUserInfoParams {
  id?: number;
  name?: string;
}

export const useUserController_queryUserInfo = () => {
  const apiCall = async (params: UserController_queryUserInfoParams) => {
    const path = `${process.env.REACT_APP_API_BASE_URL || ''}/api/queryUserInfo`;
    const queryParams = new URLSearchParams();
    if (params.id) queryParams.append('id', params.id.toString());
    if (params.name) queryParams.append('name', params.name.toString());
    const queryString = queryParams.toString();
    const url = `${path}${queryString ? '?' + queryString : ''}`;
    const options: RequestInit = {
      method: 'GET',
    };

    const result = await fetch(url, options);
    return result.json() as Promise<User[]>;
  };

  return { userController_queryUserInfo: apiCall };
};

