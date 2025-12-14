## 1. 后端 OpenAPI 文档要求

为了能够正确生成前端 SDK，后端需要提供符合特定格式的 OpenAPI 3.1 规范文档。以下是具体要求：

### 1.1 OpenAPI 文档结构要求

后端 API 文档必须遵循 OpenAPI 3.1 规范，并包含以下必要组成部分：

#### 1.1.1 文档根结构
```json
{
  "openapi": "3.1.0-rc0",
  "info": {
    "title": "服务名称",
    "description": "服务描述",
    "version": "API 版本"
  },
  "servers": [
    {
      "url": "服务地址",
      "description": "环境描述",
      "x-environment": "环境标识"
    }
  ],
  "components": {
    "schemas": {
      // 数据模型定义
    }
  },
  "paths": {
    // API 端点定义
  }
}
```

#### 1.1.2 数据模型定义 (components.schemas)

数据模型必须按照以下格式定义：

1. **对象类型**：
```json
"ModelName": {
  "type": "object",
  "properties": {
    "field_name": {
      "type": "数据类型",  // string, integer, number, boolean, array 等
      "format": "格式说明",  // 如 timestamp, date 等
      "pattern": "正则表达式", // 如 "^\\d{4}-\\d{2}-\\d{2}$"
      "title": "字段标题"  // 作为 TypeScript 注释
    }
  },
  "required": ["必需字段列表"]
}
```

2. **枚举类型**：
```json
"EnumName": {
  "type": "string",
  "enum": ["值1", "值2", "值3"]
}
```

3. **联合类型 (oneOf)**：
```json
"UnionType": {
  "oneOf": [
    {
      "type": "null"
    },
    {
      "$ref": "#/components/schemas/OtherModel"
    }
  ]
}
```

4. **数组类型**：
```json
"ArrayField": {
  "type": "array",
  "items": {
    "$ref": "#/components/schemas/ItemType"
  }
}
```

5. **可空类型处理**：
- 使用数组形式 `"type": ["string", "null"]`
- 或使用 `oneOf` 包含 null 类型

#### 1.1.3 API 端点定义 (paths)

API 端点必须按照以下格式定义：

1. **路径和操作**：
```json
"/api/path/{paramName}": {
  "get|post|put|delete": {
    "summary": "API 摘要",  // 作为 TypeScript 注释
    "description": "API 描述",  // 作为 TypeScript 注释
    "tags": ["分组名称"],  // 用于 API 分组
    "operationId": "apiMethodName",  // 生成的 API 方法名
    "parameters": [...],  // 请求参数
    "requestBody": {...},  // 请求体 (POST/PUT)
    "responses": {...}    // 响应定义
  }
}
```

2. **参数定义**：
```json
"parameters": [
  {
    "name": "参数名",
    "in": "path|query|header|cookie",  // 参数位置
    "schema": {
      "type": "参数类型",
      "format": "格式"
    },
    "required": true|false,  // 是否必需
    "description": "参数描述"
  }
]
```

3. **请求体定义**：
```json
"requestBody": {
  "description": "请求体描述",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/RequestBodyModel"
      }
    }
  },
  "required": true
}
```

4. **响应定义**：
```json
"responses": {
  "200": {
    "description": "成功响应描述",
    "content": {
      "application/json": {
        "schema": {
          "$ref": "#/components/schemas/ResponseModel"
        }
      }
    }
  },
  "201": {
    // 创建成功响应
  },
  "204": {
    "description": "No Content"  // 无返回值
  },
  "500": {
    // 错误响应
  }
}
```

### 1.2 特殊类型处理

#### 1.2.1 引用处理
- 使用 `$ref` 引用定义在 `components.schemas` 中的模型
- 格式：`"$ref": "#/components/schemas/ModelName"`

#### 1.2.2 类型映射
- `integer` → TypeScript `number`
- `string` → TypeScript `string`
- `boolean` → TypeScript `boolean`
- `array` → TypeScript `Type[]`
- `null` → TypeScript 可空类型

#### 1.2.3 字段特性
- 使用 `title` 属性作为字段注释
- 使用 `description` 属性作为详细说明
- 使用 `pattern` 属性定义字符串格式验证

### 1.3 生成器特殊处理

当前 SDK 生成器会进行以下特殊处理：

1. **路径参数转换**：将路径中的 `{paramName}` 转换为 `{paramName}` 并进行驼峰命名
2. **参数展开**：对于可选参数，会将对象参数展开为多个独立参数
3. **默认值处理**：为可空字段生成适当的默认值处理逻辑
4. **导入检测**：自动分析类型依赖关系并生成相应的导入语句

### 1.4 完整示例

以下是一个完整的 API 端点定义示例：

```json
{
  "openapi": "3.1.0-rc0",
  "info": {
    "title": "Example Service",
    "version": "1.0.0"
  },
  "paths": {
    "/users/{userId}": {
      "get": {
        "summary": "获取用户信息",
        "description": "根据用户ID获取用户详细信息",
        "tags": ["User"],
        "operationId": "getUserById",
        "parameters": [
          {
            "name": "userId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer"
            },
            "description": "用户ID"
          },
          {
            "name": "includeProfile",
            "in": "query",
            "required": false,
            "schema": {
              "type": "boolean",
              "default": false
            },
            "description": "是否包含用户档案信息"
          }
        ],
        "responses": {
          "200": {
            "description": "成功获取用户信息",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/User"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "User": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "title": "用户ID"
          },
          "name": {
            "type": "string",
            "title": "用户名"
          },
          "email": {
            "type": ["string", "null"],
            "title": "邮箱地址"
          },
          "profile": {
            "oneOf": [
              {
                "type": "null"
              },
              {
                "$ref": "#/components/schemas/UserProfile"
              }
            ],
            "title": "用户档案"
          }
        },
        "required": ["id", "name"]
      },
      "UserProfile": {
        "type": "object",
        "properties": {
          "age": {
            "type": "integer",
            "title": "年龄"
          },
          "bio": {
            "type": "string",
            "title": "个人简介"
          }
        },
        "required": ["age", "bio"]
      }
    }
  }
}
```

这个自动化 SDK 生成系统通过解析 OpenAPI 规范，使用模板引擎生成类型安全的 TypeScript 代码，大大减少了手动编写 API 客户端的工作量，同时确保了前端与后端 API 的一致性。