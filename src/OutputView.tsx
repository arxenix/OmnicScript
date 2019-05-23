import React from 'react';
import MonacoEditor from 'react-monaco-editor';

type Props = {
    code: string;
    onChange?: (code: string, event: any) => void;
};
type State = {};

export class OutputView extends React.Component<Props, State> {
    public static defaultProps = {
        code: '{}',
        onChange: ()=>{}
    };


    constructor(props: Props) {
        super(props);
    }

    editorDidMount(editor, monaco) {
        console.log(editor);
        console.log(monaco);
    }

    render() {
        let {code, onChange} = this.props;

        const options = {
            automaticLayout: true,
            readOnly: true
        };
        return (
            <div style={{border: '1px solid black'}}>
                <MonacoEditor
                    height='80vh'
                    width='100%'
                    value={code}
                    language='json'
                    editorDidMount={this.editorDidMount}
                    options={options}
                    onChange={onChange}
                />
            </div>
        )
    }
}