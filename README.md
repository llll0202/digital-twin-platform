# 说明

基于three.js的数字孪生大屏项目


- [vue3](https://vuejs.org/guide/typescript/overview.html#project-setup)
- [three.js](https://threejs.org/docs/index.html)

# git-lfs

模型文件超过100M 采用 git-lfs([安装 Git Large File Storage](https://docs.github.com/zh/repositories/working-with-files/managing-large-files/installing-git-large-file-storage)) 存储

#### 配置 Git Large File Storage

```bash

git lfs track "*.glb"

```
# How to

## install dependencies

``` bash
pnpm 
```
## start dev
```bash
pnpm dev
```
# digital-twin-platform
本项目当前的 AI 监测功能采用规则分析方式实现，后端会根据设备温度、压力、作业率、合格率等指标进行风险判断，并返回对应的分析结果。后续可进一步接入真实大模型接口，实现更自然的设备诊断报告和智能运维建议。
