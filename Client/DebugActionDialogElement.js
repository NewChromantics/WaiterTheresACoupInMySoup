
const ElementName = 'debug-action-choices';
export default ElementName;


class DebugActionChoices extends HTMLElement
{
	constructor()
	{
		super();
		
		//	overwrite this
		//	gr: should this be an attribute?
		//		should probably also be a specific HTML element event type
		this.onselection = console.log;
	}
	
	static get observedAttributes() 
	{
		return ['css','actions'];
	}
	get css()					{	return this.getAttribute('css');	}
	set css(Css)				{	Css ? this.setAttribute('css', Css) : this.removeAttribute('css');	}

	get actions()					
	{
		let ActionsString = this.getAttribute('actions');
		//	avoid hitting exception in debugger for common case 
		if ( !ActionsString.length )
			return {};
		try
		{
			return JSON.parse(ActionsString);
		}
		catch(e)
		{
			console.error(e);
			return {};
		}
	}
	set actions(ActionsJson)
	{
		if ( !ActionsJson )
		{
			this.removeAttribute('actions');
			return;
		}
		
		if ( typeof ActionsJson != typeof '' )
			ActionsJson = JSON.stringify(ActionsJson);
			
		this.setAttribute('actions', ActionsJson);
	}
	
	GetActionContainerElement()
	{
		return this.Shadow;
	}
	
	OnSelection(ActionName,Arg1,Arg2,etc)
	{
		return this.onselection( Array.from(arguments) );
	}
	
	UpdateActionDom()
	{
		const Actions = this.actions;
		const ActionDivContainer = this.GetActionContainerElement();
		
		while ( ActionDivContainer.firstChild )
			ActionDivContainer.removeChild( ActionDivContainer.firstChild );
		
		const OnSelection = this.OnSelection.bind(this);
		
		//	add button for each action choice
		function AddActionButton(ActionName,Action)
		{
			const Div = document.createElement('div');
			ActionDivContainer.appendChild(Div);
			const Button = document.createElement('input');
			Div.appendChild(Button);
			Button.type = 'button';
			Button.value = ActionName;
			
			function MakeArgumentInput(ArgumentChoices)
			{
				const Input = document.createElement('select');
				Div.appendChild(Input);
				function AddOption(ArgumentValue)
				{
					const Option = document.createElement('option');
					Option.value = ArgumentValue;
					Option.text = ArgumentValue;
					Input.appendChild(Option);
				}
				ArgumentChoices.forEach(AddOption);
				return Input;
			}
			const ArgumentInputs = Action.Arguments.map(MakeArgumentInput);
			
			function OnClick()
			{
				const ArgumentValues = ArgumentInputs.map( i => i.value );
				OnSelection(ActionName,...ArgumentValues);
			}
			Button.onclick = OnClick;
		}
		
		for ( let ActionName in Actions )
		{
			const Action = Actions[ActionName];
			AddActionButton( ActionName, Action );
		}
	}

	SetupDom(Parent)
	{
		//this.Style = document.createElement('style');
		//Parent.appendChild(this.Style);
		this.UpdateActionDom();
	}
	
	GetCssContent()
	{
		let Css = ``;
		if ( this.css )
			Css += `@import "${this.css}";`;
			
		Css += `
		:host
		{
			position:	relative;
		}
		`;
		return Css;
	}
	
	attributeChangedCallback(name, oldValue, newValue) 
	{
		if ( this.Shadow )
			this.UpdateActionDom();
			
		if ( this.Style )
			this.Style.textContent = this.GetCssContent();
	}
	
	connectedCallback()
	{
		//	Create a shadow root
		this.Shadow = this.attachShadow({mode: 'open'});
		this.SetupDom(this.Shadow);
		this.attributeChangedCallback();
	}
}


//	name requires dash!
window.customElements.define( ElementName, DebugActionChoices );
