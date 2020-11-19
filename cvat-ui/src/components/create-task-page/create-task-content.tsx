// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';
import { Row, Col } from 'antd/lib/grid';
import Alert from 'antd/lib/alert';
import Button from 'antd/lib/button';
import Collapse from 'antd/lib/collapse';
import notification from 'antd/lib/notification';
import Text from 'antd/lib/typography/Text';

import ConnectedFileManager from 'containers/file-manager/file-manager';
import BasicConfigurationForm, { BaseConfiguration } from './basic-configuration-form';
import AdvancedConfigurationForm, { AdvancedConfiguration } from './advanced-configuration-form';
import LabelsEditor from '../labels-editor/labels-editor';
import { Files } from '../file-manager/file-manager';
import axios from 'axios'
const fs = require('fs');
import getCore from 'cvat-core-wrapper';
const core = getCore();

export interface CreateTaskData {
    basic: BaseConfiguration;
    advanced: AdvancedConfiguration;
    labels: any[];
    files: Files;
    isS3Data: Boolean;
    fileLinks: string[]
}

interface Props {
    onCreate: (data: CreateTaskData) => void;
    status: string;
    taskId: number | null;
    installedGit: boolean;
}

type State = CreateTaskData;

const defaultState = {
    basic: {
        name: '',
    },
    advanced: {
        lfs: false,
        useZipChunks: true,
        useCache: true,
    },
    labels: [],
    files: {
        local: [],
        share: [],
        remote: [],
        s3:[]
    },
    isS3Data: false,
    fileLinks: []
};

class CreateTaskContent extends React.PureComponent<Props & RouteComponentProps, State> {
    private basicConfigurationComponent: any;

    private advancedConfigurationComponent: any;

    private fileManagerContainer: any;

    public constructor(props: Props & RouteComponentProps) {
        super(props);
        this.state = { ...defaultState };
    }

    public componentDidUpdate(prevProps: Props): void {
        const { status, history, taskId } = this.props;

        if (status === 'CREATED' && prevProps.status !== 'CREATED') {
            const btn = <Button onClick={() => history.push(`/tasks/${taskId}`)}>Open task</Button>;

            notification.info({
                message: 'The task has been created',
                btn,
            });

            this.basicConfigurationComponent.resetFields();
            if (this.advancedConfigurationComponent) {
                this.advancedConfigurationComponent.resetFields();
            }

            this.fileManagerContainer.reset();

            this.setState({
                ...defaultState,
            });
        }
    }

    private validateLabels = (): boolean => {
        const { labels } = this.state;
        return !!labels.length;
    };

    private validateFiles = (): boolean => {
        const files = this.fileManagerContainer.getFiles();
        this.setState({
            files,
        });
        const totalLen = Object.keys(files).reduce((acc, key) => acc + files[key].length, 0);

        return !!totalLen;
    };

    private handleSubmitBasicConfiguration = (values: BaseConfiguration): void => {
        this.setState({
            basic: { ...values },
        });
    };

    private handleSubmitAdvancedConfiguration = (values: AdvancedConfiguration): void => {
        this.setState({
            advanced: { ...values },
        });
    };

    private downloadFiles = async (): Promise<any> => {
        const fileLinks = await this.fileManagerContainer.getFileLinks()
        this.setState({
            fileLinks: fileLinks
        })
        this.state.fileLinks.map((imgLink) => {

            let img = document.createElement('img');
            img.src = imgLink

            // make <canvas> of the same size
            let canvas = document.createElement('canvas');
            canvas.width = '500px';
            canvas.height = '500px';

            let context = canvas.getContext('2d');

            // copy image to it (this method allows to cut image)
            context.drawImage(img, 0, 0);
            // we can context.rotate(), and do many other things on canvas

            // toBlob is async opereation, callback is called when done
            canvas.toBlob(function(blob) {
            // blob ready, download it
            let link = document.createElement('a');
            link.download = imgLink;

            link.href = URL.createObjectURL(blob);
            link.click();

            // delete the internal blob reference, to let the browser clear memory from it
            URL.revokeObjectURL(link.href);
            }, 'image/png');
            console.log('img -> ', img)
            console.log('canvas -> ', canvas)


            // const x = this
            // let tempImage: any;
            // var request = require('request'), 
            // fs = require('fs');
            // const img = new File(link)
            // var reader  = new FileReader();

            // reader.onloadend = function () {
            //   console.log(reader.result);
            // }
            // reader.readAsDataURL(link);
            // console.log(reader)
            // axios.get(link).then((response) => {
            //     console.log('buffer -> ', response);
                
            //     // img.src = response.data
            //     x.setState({
            //                     files: {
            //                         ...x.state.files,
            //                         s3: [...x.state.files.s3, img],
            //                     }
            //                 })
                // fs.writeFile(tempImage, response.data, {
                //         encoding : null
                //     }, function(err: any) {
                
                //         if (err)
                //             throw err;
                //         console.log('It\'s saved!');
                //         x.setState({
                //             files: {
                //                 ...x.state.files,
                //                 s3: [...x.state.files.s3, tempImage],
                //             }
                //         })
                //     })
            // }).catch((error: any) => {
            //     console.log(error.toString())
            // })
            // core.server
            //     .request(link, {
            //         method: 'GET',
            //     }).then((response: any): void => {
            //         console.log('buffer -> ', response instanceof Buffer);
            
                    //do what you want with body
                    //like writing the buffer to a file
                    // fs.writeFile(tempImage, body, {
                    //     encoding : null
                    // }, function(err) {
                
                    //     if (err)
                    //         throw err;
                    //     console.log('It\'s saved!');
                    //     x.setState({
                    //         files: {
                    //             ...x.state.files,
                    //             s3: [...x.state.files.s3, tempImage],
                    //         }
                    //     })
                // }).catch((error: any): void => {
                //     console.log(error.toString())
                // })
        })
        // this.setState({
        //     files,
        // });
        // const totalLen = Object.keys(files).reduce((acc, key) => acc + files[key].length, 0);

        // return !!totalLen;
    };

    private handleSubmitClick = (): void => {
        if(!this.state.isS3Data){
            if (!this.validateLabels()) {
                notification.error({
                    message: 'Could not create a task',
                    description: 'A task must contain at least one label',
                });
                return;
            }
    
            if (!this.validateFiles()) {
                notification.error({
                    message: 'Could not create a task',
                    description: 'A task must contain at least one file',
                });
                return;
            }
        }else{
            this.downloadFiles()
            // console.log(fileLinks)
        }

        this.basicConfigurationComponent
            .submit()
            .then(() => {
                if (this.advancedConfigurationComponent) {
                    return this.advancedConfigurationComponent.submit();
                }

                return new Promise((resolve): void => {
                    resolve();
                });
            })
            .then((): void => {
                const { onCreate } = this.props;
                onCreate(this.state);
            })
            .catch((error: Error): void => {
                notification.error({
                    message: 'Could not create a task',
                    description: error.toString(),
                });
            });
    };

    private renderBasicBlock(): JSX.Element {
        return (
            <Col span={24}>
                <BasicConfigurationForm
                    wrappedComponentRef={(component: any): void => {
                        this.basicConfigurationComponent = component;
                    }}
                    onSubmit={this.handleSubmitBasicConfiguration}
                />
            </Col>
        );
    }

    private renderLabelsBlock(): JSX.Element {
        const { labels } = this.state;

        return (
            <Col span={24}>
                <Text type='danger'>* </Text>
                <Text className='cvat-text-color'>Labels:</Text>
                <LabelsEditor
                    labels={labels}
                    onSubmit={(newLabels): void => {
                        this.setState({
                            labels: newLabels,
                        });
                    }}
                />
            </Col>
        );
    }

    private handleS3 = (value: boolean) => {
        this.setState({
            isS3Data: value
        })
    }

    private renderFilesBlock(): JSX.Element {
        return (
            <Col span={24}>
                <Text type='danger'>* </Text>
                <Text className='cvat-text-color'>Select files:</Text>
                <ConnectedFileManager
                    handleS3={this.handleS3}
                    ref={(container: any): void => {
                        this.fileManagerContainer = container;
                    }}
                    withRemote
                />
            </Col>
        );
    }

    private renderAdvancedBlock(): JSX.Element {
        const { installedGit } = this.props;
        return (
            <Col span={24}>
                <Collapse>
                    <Collapse.Panel key='1' header={<Text className='cvat-title'>Advanced configuration</Text>}>
                        <AdvancedConfigurationForm
                            installedGit={installedGit}
                            wrappedComponentRef={(component: any): void => {
                                this.advancedConfigurationComponent = component;
                            }}
                            onSubmit={this.handleSubmitAdvancedConfiguration}
                        />
                    </Collapse.Panel>
                </Collapse>
            </Col>
        );
    }

    public render(): JSX.Element {
        const { status } = this.props;
        const loading = !!status && status !== 'CREATED' && status !== 'FAILED';

        return (
            <Row type='flex' justify='start' align='middle' className='cvat-create-task-content'>
                <Col span={24}>
                    <Text className='cvat-title'>Basic configuration</Text>
                </Col>

                {this.renderBasicBlock()}
                {this.renderLabelsBlock()}
                {this.renderFilesBlock()}
                {this.renderAdvancedBlock()}

                <Col span={18}>{loading ? <Alert message={status} /> : null}</Col>
                <Col span={6}>
                    <Button loading={loading} disabled={loading} type='primary' onClick={this.handleSubmitClick}>
                        Submit
                    </Button>
                </Col>
            </Row>
        );
    }
}

export default withRouter(CreateTaskContent);
