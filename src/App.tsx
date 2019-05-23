import React, {createRef} from 'react';
import {OutputView} from "./OutputView";
import {Button, Container, Divider, Dropdown, Grid, Header, Icon} from "semantic-ui-react";
import {InputView} from "./InputView";
import {compile} from "./compiler";

type Props = {

}

type State = {
   output?: string;
   sample?: string;
}

const samples = ['basic.ts'];
const sampleDropdownOptions = samples.map(s=>{
    return {
        key: s,
        text: s,
        value: s
    }
});

export class App extends React.Component<Props, State> {
    private inputRef = createRef<InputView>();

    constructor(props: Props) {
        super(props);

        this.state = {
            output: '{}',
            sample: '// Your code here'
        };

        this.doSelectSample(null, {value: samples[0]});
    }

    doSelectSample = (event, data) => {
        const sampleName = data.value;
        fetch(`/samples/${sampleName}`).then(r => r.text()).then(r => {
            this.setState({
                sample: r
            });
        })
    };

    doCompile = () => {
        console.log(this.inputRef);
        if (this.inputRef.current !== null && this.inputRef.current.monacoRef.current !== null) {
            const monacoEditor = this.inputRef.current.monacoRef.current.editor as any;
            const code = monacoEditor.getValue();

            compile(code).then(result => {
                this.setState({
                    output: result
                });
            });
            console.log(monacoEditor.getValue());
        }
    };

    render() {
        const {output, sample} = this.state;

        return (
            <Container fluid>
                <Grid>
                    <Grid.Row columns={1}>
                        <Grid.Column>
                            <Container text textAlign='center'>
                                <Header as='h1'>
                                    OmnicScript IDE
                                </Header>
                                <br/>
                                <a href='https://omnicscript-docs.arxenix.dev/'>Docs</a>
                            </Container>
                        </Grid.Column>
                    </Grid.Row>
                    <Grid.Row columns={2}>
                        <Grid.Column>
                            <Dropdown placeholder='Select sample...' selection options={sampleDropdownOptions} onChange={this.doSelectSample}/>
                        </Grid.Column>
                        <Grid.Column>
                            <Button animated positive onClick={this.doCompile}>
                                <Button.Content visible>Compile</Button.Content>
                                <Button.Content hidden><Icon name='arrow right'/></Button.Content>
                            </Button>
                        </Grid.Column>
                    </Grid.Row>
                    <Grid.Row columns={2}>
                        <Grid.Column>
                            <InputView ref={this.inputRef} code={sample}/>
                        </Grid.Column>
                        <Grid.Column>
                            <OutputView code={output}/>
                        </Grid.Column>
                    </Grid.Row>
                </Grid>
            </Container>
        )
    }
}

