// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import Tabs from 'antd/lib/tabs';
import Icon from 'antd/lib/icon';
import Input from 'antd/lib/input';
import Text from 'antd/lib/typography/Text';
import Paragraph from 'antd/lib/typography/Paragraph';
import Upload, { RcFile } from 'antd/lib/upload';
import Empty from 'antd/lib/empty';
import aws from 'aws-sdk'
import Tree, { AntTreeNode, TreeNodeNormal } from 'antd/lib/tree/Tree';
import FileBrowser, {Icons} from 'react-keyed-file-browser'
import 'react-keyed-file-browser/dist/react-keyed-file-browser.css'
import axios from 'axios'

import consts from 'consts';
import { relativeTimeThreshold } from 'moment';
import getCore from 'cvat-core-wrapper';
const core = getCore();
const baseURL = core.config.backendAPI

export interface Files {
    local: File[];
    share: string[];
    remote: string[];
    s3: File[]
}

interface State {
    files: Files;
    expandedKeys: string[];
    active: 'local' | 'share' | 'remote' | 's3';
    s3SelectedKeys: string[];
    s3Directories: object[]
}

interface Props {
    withRemote: boolean;
    treeData: TreeNodeNormal[];
    onLoadData: (key: string, success: () => void, failure: () => void) => void;
    handleS3: (value: any) => void
}

export default class FileManager extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);

        this.state = {
            files: {
                local: [],
                share: [],
                remote: [],
                s3: []
            },
            s3SelectedKeys: [],
            expandedKeys: [],
            active: 'local',
            s3Directories:[]
        };

        this.loadData('/');
    }

   
     componentDidMount(){
        core.server
                .request(`${baseURL}/get_s3_data/`, {
                    method: 'GET',
                }).then((response: any): void => {
                    this.setState({
                        s3Directories: response.data
                    })
                }).catch((error: any): void => {
                    console.log(error.toString())
                })
    }

    public getFiles(): Files {
        const { active, files } = this.state;
        return {
            local: active === 'local' ? files.local : [],
            share: active === 'share' ? files.share : [],
            remote: active === 'remote' ? files.remote : [],
            s3: active === 's3' ? files.s3 : [],
        };
    }

    public async getFileLinks(): Promise<any> {
        const { s3SelectedKeys } = this.state;
       const response = await core.server
                .request(`${baseURL}/get_s3_signed_data/`,{
                    method: 'POST',
                    data: {
                        'keys': s3SelectedKeys
                    }
                }).then((response: any): void => {
                    console.log('response -> ', response)
                    return response
                }).catch((error: any): void => {
                    return error
                })
        return response
        
    }

    private loadData = (key: string): Promise<void> =>
        new Promise<void>((resolve, reject): void => {
            const { onLoadData } = this.props;

            const success = (): void => resolve();
            const failure = (): void => reject();
            onLoadData(key, success, failure);
        });

    public reset(): void {
        this.setState({
            expandedKeys: [],
            active: 'local',
            files: {
                local: [],
                share: [],
                remote: [],
            },
        });
    }

    private renderLocalSelector(): JSX.Element {
        const { files } = this.state;

        return (
            <Tabs.TabPane key='local' tab='My computer'>
                <Upload.Dragger
                    multiple
                    listType='text'
                    fileList={files.local as any[]}
                    showUploadList={
                        files.local.length < 5 && {
                            showRemoveIcon: false,
                        }
                    }
                    beforeUpload={(_: RcFile, newLocalFiles: RcFile[]): boolean => {
                        this.setState({
                            files: {
                                ...files,
                                local: newLocalFiles,
                            },
                        });
                        return false;
                    }}
                >
                    <p className='ant-upload-drag-icon'>
                        <Icon type='inbox' />
                    </p>
                    <p className='ant-upload-text'>Click or drag files to this area</p>
                    <p className='ant-upload-hint'>Support for a bulk images or a single video</p>
                </Upload.Dragger>
                {files.local.length >= 5 && (
                    <>
                        <br />
                        <Text className='cvat-text-color'>{`${files.local.length} files selected`}</Text>
                    </>
                )}
            </Tabs.TabPane>
        );
    }

    private renderShareSelector(): JSX.Element {
        function renderTreeNodes(data: TreeNodeNormal[]): JSX.Element[] {
            // sort alphabetically
            data.sort((a: TreeNodeNormal, b: TreeNodeNormal): number => a.key.localeCompare(b.key));
            return data.map((item: TreeNodeNormal) => {
                if (item.children) {
                    return (
                        <Tree.TreeNode title={item.title} key={item.key} dataRef={item} isLeaf={item.isLeaf}>
                            {renderTreeNodes(item.children)}
                        </Tree.TreeNode>
                    );
                }

                return <Tree.TreeNode key={item.key} {...item} dataRef={item} />;
            });
        }

        const { SHARE_MOUNT_GUIDE_URL } = consts;
        const { treeData } = this.props;
        const { expandedKeys, files } = this.state;

        return (
            <Tabs.TabPane key='share' tab='Connected file share'>
                {treeData[0].children && treeData[0].children.length ? (
                    <Tree
                        className='cvat-share-tree'
                        checkable
                        showLine
                        checkStrictly={false}
                        expandedKeys={expandedKeys}
                        checkedKeys={files.share}
                        loadData={(node: AntTreeNode): Promise<void> => this.loadData(node.props.dataRef.key)}
                        onExpand={(newExpandedKeys: string[]): void => {
                            this.setState({
                                expandedKeys: newExpandedKeys,
                            });
                        }}
                        onCheck={(
                            checkedKeys:
                                | string[]
                                | {
                                      checked: string[];
                                      halfChecked: string[];
                                  },
                        ): void => {
                            const keys = checkedKeys as string[];
                            this.setState({
                                files: {
                                    ...files,
                                    share: keys,
                                },
                            });
                        }}
                    >
                        {renderTreeNodes(treeData)}
                    </Tree>
                ) : (
                    <div className='cvat-empty-share-tree'>
                        <Empty />
                        <Paragraph className='cvat-text-color'>
                            Please, be sure you had
                            <Text strong>
                                <a href={SHARE_MOUNT_GUIDE_URL}> mounted </a>
                            </Text>
                            share before you built CVAT and the shared storage contains files
                        </Paragraph>
                    </div>
                )}
            </Tabs.TabPane>
        );
    }

    private renderRemoteSelector(): JSX.Element {
        const { files } = this.state;

        return (
            <Tabs.TabPane key='remote' tab='Remote sources'>
                <Input.TextArea
                    placeholder='Enter one URL per line'
                    rows={6}
                    value={[...files.remote].join('\n')}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
                        this.setState({
                            files: {
                                ...files,
                                remote: event.target.value.split('\n'),
                            },
                        });
                    }}
                />
            </Tabs.TabPane>
        );
    }
    public handleSelect = (event: object): void => {
        const ele: string = event.key
        console.log(ele.split('/'))
    }
    private renderS3BucketSelector(): JSX.Element {
        const { DirectoryTree } = Tree;
        
          const onSelect = (keys, event) => {
            console.log('Trigger Select', keys, event);
          };
          const onCheck = (checkedKeys, info) => {
            this.setState({
                s3SelectedKeys: checkedKeys
            })
          };
        
          const onExpand = () => {
            console.log('Trigger Expand');
          };
        return (
            <Tabs.TabPane key='s3' tab='S3 Bucket'>
                {/* <FileBrowser 
                files={s3Files}
                icons={Icons.FontAwesome(4)}
                // onSelect={this.handleSelect}
                /> */}
                <DirectoryTree
                    checkable
                    multiple
                    defaultExpandAll
                    onSelect={onSelect}
                    onExpand={onExpand}
                    onCheck={onCheck}
                    treeData={this.state.s3Directories}
                />
            </Tabs.TabPane>
        );
    }


    public render(): JSX.Element {
        const { withRemote } = this.props;
        const { active } = this.state;
        
        return (
            <>
                <Tabs
                    type='card'
                    activeKey={active}
                    tabBarGutter={5}
                    onChange={(activeKey: string): void =>{
                        this.setState({
                            active: activeKey as any,
                        })
                        if(activeKey === 's3'){
                            this.props.handleS3(true)
                        }else{
                            this.props.handleS3(false)
                        }
                        
                    }
                    }
                >
                    {this.renderLocalSelector()}
                    {this.renderShareSelector()}
                    {withRemote && this.renderRemoteSelector()}
                    {this.renderS3BucketSelector()}
                </Tabs>
            </>
        );
    }
}
