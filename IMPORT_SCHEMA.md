# 课程导入数据格式

## 推荐 JSON 结构

```json
{
  "school": {
    "id": "example-law",
    "nameZh": "示例法学院",
    "nameEn": "Example Law School",
    "shortZh": "示例",
    "termLabel": "Fall 2026",
    "catalogUrl": "https://example.edu/law/courses",
    "term": {
      "instructionStart": "2026-08-24",
      "instructionEnd": "2026-12-03",
      "examEnd": "2026-12-18"
    }
  },
  "courses": [
    {
      "code": "LAW 6001",
      "titleEn": "Contracts",
      "descriptionEn": "Official English description.",
      "titleZh": "合同法",
      "descriptionZh": "可选的中文译文。",
      "credits": 3,
      "gradingZh": "仅字母等级评分",
      "instructors": ["Professor Name"],
      "barStatus": "review",
      "barPrimary": null,
      "eligibility": "open",
      "sourceUrl": "https://example.edu/course/6001",
      "sections": [
        {
          "id": "LAW-6001-001",
          "label": "讲授课 001",
          "classNumber": "12345",
          "days": "MW",
          "start": "10:00",
          "end": "11:15",
          "startDate": "2026-08-24",
          "endDate": "2026-12-03",
          "location": "Law Building 101",
          "selectionGroup": "lecture",
          "selectionGroupLabel": "Required lecture",
          "selectionRequired": true,
          "selectionMax": 1
        }
      ]
    }
  ]
}
```

`code` 和 `titleEn` 或 `titleZh` 是唯一的保存前提。英文官方字段可单独导入；中文字段缺失只会显示提示。没有上课时间或地点的课程仍会导入，但不会进入周课表。

## Lecture + discussion

当课程需要一节 lecture 加一节 discussion 时，lecture 和每个 discussion 都应有不同的 `selectionGroup`。例如 lecture 使用 `lecture`，discussion 使用 `discussion`；两个组均设置 `selectionRequired: true` 和 `selectionMax: 1`。软件会要求每个组都选择一项，因此 lecture 必选，而 discussion 只能选择一节。

## NY Bar 状态

`barStatus`：

- `eligible`：计入 NY Bar 24 个课堂学分；
- `ineligible`：不计入；
- `review`：资格待确认，外校导入推荐使用此值。

`barPrimary`：

- `professional`：职业责任；
- `writing`：法律研究、写作与分析；
- `american`：美国法律体系；
- `core`：Bar／NYLE 核心；
- `null`：不指定类别。

## 选课权限

`eligibility`：

- `open`：可直接选；
- `automatic`：自动注册；
- `application`：需申请；
- `permission`：需教师许可；
- `restricted`：限特定项目。

## 星期格式

- `M`：周一
- `T`：周二
- `W`：周三
- `R`：周四
- `F`：周五

例如周一、周三写 `MW`，周二、周四写 `TR`。
