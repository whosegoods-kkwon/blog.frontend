import { useState, useEffect } from 'react';
import {
    editorTagInterface,
    postRequestInterface,
} from 'commonTypes';
import {
    postCreate,
    postEdit,
    postPublish,
    postUpdate,
    postWaitingList,
} from 'modules/API';

import {
    postGetListResetAction
} from 'modules/redux/post';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import _Alert_ from 'lib/_Alert_';
import * as Helper from 'lib/Helper';
import { loginCheck } from 'modules/API';
import { useHistory } from 'react-router-dom';
import * as _ from "lodash";
import { useToasts } from 'react-toast-notifications';
import Swal from 'sweetalert2';

interface RouteParams {
    post_uuid: string;
}

export default function useWrite() {

    // FIXME 2020-09-26 18:19  리팩토리 필요.
    // 글을 세로 등록 할때 저장을 누르면 edit 모드로 변경 하는데.. 바꿔야 하나?
    // edit 모드 일떄 params 으로 체크를 하니 로딩이 두번됨.

    const dispatch = useDispatch();
    const history = useHistory();
    const { addToast } = useToasts();
    const params = useParams<RouteParams>();
    const [ editorTitle, setEditorTitle] = useState<string>('');
    const [ editorContents, setEditorContents] = useState<string>('');

    // 글 쓰기 테그.
    const [ editorTagContents, setEditorTagContents ] = useState<editorTagInterface>([]);

    // 글 쓰기 추천 테그.
    // FIXME 2020-10-02 01:23  테그 처리.
    const [ editorTagSuggestions, setEditorTagSuggestions] = useState<editorTagInterface>([
        { id: 'Develop', text: 'Develop' },
        { id: 'Linux', text: 'Linux' },
        { id: 'Javascript', text: 'Javascript' },
        { id: 'PHP', text: 'PHP' },
    ]);

    // 글 저장 및 업데이트
    const handleClickSaveButton = async () => {
        const dataObject : postRequestInterface = {
            title: editorTitle,
            tags: editorTagContents.map(({ id, text }) => ({ tag_id: id, tag_text: text })),
            contents: {
                html : editorContents,
                text : editorContents
            }
        };

        // post_uuid 가 있을경우 update 없으면 create.
        if(params.post_uuid && !_.isUndefined(params.post_uuid)) {
            const updateResult = await postUpdate({
                post_uuid: params.post_uuid,
                payload: dataObject
            });
            if(updateResult.status === true) {
                addToast('업데이트 되었습니다.', { appearance: 'success', autoDismiss: true });
            } else {
                _Alert_.error({text: updateResult.message ? updateResult.message : '다시 시도해 주세요.'});
            }
        } else {
            const createResult = await postCreate(dataObject);
            if(createResult.status === false) {
                _Alert_.error({text: createResult.message ? createResult.message : '다시 시도해 주세요.'});
            } else {
                // 저장 성공 했을때.
                setEditorTitle('');
                setEditorContents('');
                setEditorTagContents([]);
                const post_uuid = createResult.payload.post_uuid;
                addToast('저장 되었습니다.', { appearance: 'success', autoDismiss: true });
                history.push({
                    pathname: process.env.PUBLIC_URL + `/admin/${post_uuid}/edit`,
                    state: { edit: true }
                });
            }
        }
    }

    // 에디터 내용 업데이트
    const handleEditorContents = (contents: string) => {
        setEditorContents(contents);
    }

    // 게시 버튼 클릭
    const handleClickPublishButton = async () => {
        if(params.post_uuid && !_.isUndefined(params.post_uuid)) {
            const publishResult = await postPublish(params.post_uuid);
            if(publishResult.status === true) {
                addToast('개시 되었습니다.', { appearance: 'success', autoDismiss: true });
                history.push({
                    pathname: process.env.PUBLIC_URL + `/`
                });
            } else {
                _Alert_.error({text: publishResult.message ? publishResult.message : '다시 시도해 주세요.'});
            }
        }
    }

    // 나가기 버튼.
    const handleClickExitButton = () => {
        history.push({
            pathname: process.env.PUBLIC_URL + `/`,
        });
    }

    // 최초엔 내용들 초기화.
    useEffect(() => {
        setEditorTitle('');
        setEditorContents('');
        setEditorTagContents([]);
    }, []);

    // 최초 로그인 체크
    useEffect(() => {
        async function loginCheckApiCall() {
            let response = await loginCheck();
            if(response.status === false) {
                history.push({
                    pathname: process.env.PUBLIC_URL + `/`
                });
            } else {
                const waitingPost = await postWaitingList();
                if(waitingPost.status === true && waitingPost.payload != null) {
                    const selectBoxOptions = waitingPost.payload.map((e, n) => {
                        return e.post_title;
                    });

                    const {
                        value: selectValue,
                    } = await Swal.fire({
                        title: '작성 중인 글이 있습니다.',
                        input: 'select',
                        inputOptions: selectBoxOptions,
                        inputPlaceholder: '작성중인 글',
                        showCancelButton: true,
                        confirmButtonText: '수정',
                        cancelButtonText: '나중에',
                        inputValidator: (value) => {
                            return new Promise((resolve) => {
                                if (value === 'oranges') {
                                    resolve()
                                } else {
                                    //   resolve('You need to select oranges :)')
                                    resolve()
                                }
                            })
                        }
                    })

                    if(selectValue) {
                        const selectPostUUID = waitingPost.payload[selectValue] ? waitingPost.payload[selectValue].post_uuid : null;
                        if(selectPostUUID != null) {
                            history.push({
                                pathname: process.env.PUBLIC_URL + `/admin/${selectPostUUID}/edit`,
                                state: { write: true }
                            });
                        }
                    }
                }
            }
        }
        loginCheckApiCall();
    // FIXME 2020-10-13 16:38  eslint-disable
    // eslint-disable-next-line
    } , []);

    useEffect(() => {
        async function getPostData() {
            const editResult = await postEdit(params.post_uuid);
            if(editResult.status === true) {
                setEditorTitle(editResult.payload.post_title);
                setEditorTagContents(editResult.payload.tags.map((element: any) => {
                    return {
                        id: element.tag_id,
                        text: element.tag_text
                    }
                }));
                setEditorContents(editResult.payload.contents_text);
            }
        }

        if(params.post_uuid && !_.isUndefined(params.post_uuid)) {
            getPostData();
        }
    }, [params.post_uuid]);

    useEffect(() => {
        const localstorage = Helper.getLocalToken();
        if(localstorage.login_state === null || localstorage.login_state === false) {
            _Alert_.error({text: '로그인한 사용자만 이용할수 있습니다.'});
            history.push({
                pathname: process.env.PUBLIC_URL + '/admin/login',
                state: {
                    befor: 'write'
                }
            });
        }
    // FIXME 2020-10-06 13:45 리팩토리.
    // eslint-disable-next-line
    }, []);

    useEffect(() => {
        dispatch(postGetListResetAction());
    // FIXME 2020-10-19 22:21  리팩토리.
    // eslint-disable-next-line
    }, []);

    return {
        editorTitle,
        setEditorTitle,
        editorContents,
        handleEditorContents,
        editorTagContents,
        setEditorTagContents,
        editorTagSuggestions,
        setEditorTagSuggestions,


        handleClickExitButton,
        handleClickSaveButton,
        handleClickPublishButton,
    };
}